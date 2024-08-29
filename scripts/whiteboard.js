window.onload = function () {
    const SUPABASE_URL = 'https://jsorbpmakyqrjopxswzh.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impzb3JicG1ha3lxcmpvcHhzd3poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ5NTU1OTIsImV4cCI6MjA0MDUzMTU5Mn0.8RCd2J5Koxeqdxbf8cgqukApw-or2IN9kFC5zBTEAZs';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
    // Configuration
    const PASSWORD = 'skibidi'; // Replace with your password or secure method
    let userId = localStorage.getItem('userId') || Math.random().toString(36).substr(2, 9); 
    localStorage.setItem('userId', userId);
    
    // State Management
    let nickname = '';
    let currentTool = 'draw';
    let isDrawing = false;
    let startX, startY;
    let history = [];
    let historyIndex = -1;
    let scale = 1;
    let translateX = 0;
    let translateY = 0;
    let selectedArea = null;
    let isDraggingSelection = false;
    let selectionOffsetX, selectionOffsetY;

    function validatePassword() {
        console.log("validatePassword function called.");
        nickname = document.getElementById('nickname-input').value;
        const passwordInput = document.getElementById('password-input').value;
        const errorMessage = document.getElementById('error-message');
        
        if (!nickname) {
            errorMessage.textContent = 'Nickname cannot be empty.';
            return;
        }
        if (!passwordInput) {
            errorMessage.textContent = 'Password cannot be empty.';
            return;
        }

        const storedPassword = localStorage.getItem('whiteboardPassword');
        let loginCount = localStorage.getItem('loginCount') || 0; 

        if (passwordInput === PASSWORD || passwordInput === storedPassword) {
            localStorage.setItem('whiteboardPassword', passwordInput);
            loginCount = 0; 
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('whiteboard-container').style.display = 'block';
            initializeWhiteboard();
        } else {
            errorMessage.textContent = 'Incorrect password, try again.';
            loginCount++;
        }

        localStorage.setItem('loginCount', loginCount);
        if (loginCount >= 10) {
            localStorage.removeItem('whiteboardPassword');
            localStorage.removeItem('loginCount');
        }
    }
    
    window.validatePassword = validatePassword;

    function initializeWhiteboard() {
        setupEventListeners();
        loadWhiteboardData();
        subscribeToRealTimeUpdates();
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
    }

    function setupEventListeners() {
        const tools = ['eraser', 'text', 'select'];
        tools.forEach(tool => {
            document.getElementById(`${tool}-tool`).addEventListener('click', () => {
                currentTool = tool;
                canvas.style.cursor = tool === 'eraser' ? 'url(eraser-cursor.png), auto' : tool;
            });
        });

        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('wheel', handleMouseWheel);
        document.addEventListener('keydown', handleKeyDown);
        canvas.addEventListener('contextmenu', e => e.preventDefault());
    }

    function handleMouseDown(e) {
        if (e.button === 1) {
            currentTool = 'hand';
            canvas.style.cursor = 'grabbing';
            isDrawing = true;
        } else {
            startDrawing(e);
        }
    }

    function handleMouseUp(e) {
        if (e.button === 1) {
            canvas.style.cursor = 'grab';
            isDrawing = false;
        } else {
            stopDrawing(e);
        }
    }

    function startDrawing(e) {
        isDrawing = true;
        const canvasRect = canvas.getBoundingClientRect();
        startX = (e.clientX - canvasRect.left - translateX) / scale;
        startY = (e.clientY - canvasRect.top - translateY) / scale;

        if (['draw', 'eraser'].includes(currentTool)) {
            ctx.beginPath();
            ctx.moveTo(startX, startY);
        } else if (currentTool === 'text') {
            createTextBox(startX, startY);
        } else if (currentTool === 'select') {
            startSelection(e);
        }
        history.push({ tool: currentTool, ...getActionData() }); 
        historyIndex++;
    }

    function stopDrawing(e) {
        isDrawing = false;
        ctx.beginPath();
        if (currentTool === 'select') {
            endSelection(e);
        } else if (currentTool === 'fill') {
            fillArea(e);
        } else {
            saveActionToSupabase();
        }
    }

    function handleMouseWheel(e) {
        e.preventDefault();
        const zoomFactor = 1.1;
        const zoom = e.deltaY < 0 ? zoomFactor : 1 / zoomFactor;

        const canvasRect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - canvasRect.left;
        const mouseY = e.clientY - canvasRect.top;

        translateX -= (mouseX - translateX) * (zoom - 1);
        translateY -= (mouseY - translateY) * (zoom - 1);
        scale *= zoom;

        redrawCanvas();
    }

    function handleKeyDown(e) {
        if (e.ctrlKey && e.key === 'z') {
            e.preventDefault();
            undo();
        } else if (e.ctrlKey && e.key === 'y') {
            e.preventDefault();
            redo();
        }
    }

    function resizeCanvas() {
        const containerWidth = canvasContainer.clientWidth;
        const containerHeight = canvasContainer.clientHeight;

        const newCanvasWidth = Math.max(canvas.width, (containerWidth + translateX) / scale);
        const newCanvasHeight = Math.max(canvas.height, (containerHeight + translateY) / scale);

        if (newCanvasWidth > canvas.width || newCanvasHeight > canvas.height) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(canvas, 0, 0);

            canvas.width = newCanvasWidth;
            canvas.height = newCanvasHeight;
            ctx.drawImage(tempCanvas, 0, 0);
            ctx.scale(scale, scale);
            ctx.translate(translateX, translateY);
        }
    }

    function redrawCanvas() {
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
        ctx.scale(scale, scale);
        ctx.translate(translateX, translateY);
        history.forEach(item => drawFromData(item));
    }

    function undo() {
        if (historyIndex > 0) {
            historyIndex--;
            redrawCanvas();
        }
    }

    function redo() {
        if (historyIndex < history.length - 1) {
            historyIndex++;
            redrawCanvas();
        }
    }
    
      function createTextBox(x, y) {
        const textInput = document.createElement('input');
        textInput.type = 'text';
        textInput.style.position = 'absolute';
        textInput.style.left   
     = (x * scale + translateX + canvas.offsetLeft) + 'px';
        textInput.style.top = (y * scale + translateY + canvas.offsetTop) + 'px';
        textInput.style.fontSize = (thickness * scale) + 'px';
        textInput.style.color = color;
        textInput.style.border = 'none';
        textInput.style.outline = 'none';
        textInput.style.backgroundColor = 'transparent';
        document.body.appendChild(textInput);
    
        textInput.focus();
    
        textInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const text = textInput.value;
                ctx.font = textInput.style.fontSize + ' Arial';
                ctx.fillStyle = textInput.style.color;
                ctx.fillText(text, x, y + parseInt(textInput.style.fontSize)); 
    
                saveActionToSupabase({
                    x, y,
                    text,
                    color: textInput.style.color,
                    size: parseInt(textInput.style.fontSize) / scale, 
                    type: 'text'
                });
    
                textInput.remove();
            }
        });
    }
    
            textInput.remove();
// ... (Other functions and variables)

function startSelection(e) {
    const canvasRect = canvas.getBoundingClientRect();
    startX = (e.clientX - canvasRect.left - translateX) / scale;
    startY = (e.clientY - canvasRect.top - translateY) / scale;

    // Check if clicking inside an existing selection for dragging/resizing
    if (selectedArea && ctx.isPointInPath(startX, startY)) {
        isDraggingSelection = true;
        selectionOffsetX = startX - selectedArea.x;
        selectionOffsetY = startY - selectedArea.y;

        // Check if clicking near a corner for resizing
        const handleSize = 5 / scale; // Adjust handle size based on zoom
        if (isNearCorner(startX, startY, 'topLeft', handleSize)) {
            selectedArea.isResizing = true;
            selectedArea.resizeCorner = 'topLeft';
            canvas.style.cursor = 'nwse-resize';
        } else if (isNearCorner(startX + selectedArea.width, startY, 'topRight', handleSize)) {
            selectedArea.isResizing = true;
            selectedArea.resizeCorner = 'topRight';
            canvas.style.cursor = 'nesw-resize';
        } else if (isNearCorner(startX, startY + selectedArea.height, 'bottomLeft', handleSize)) {
            selectedArea.isResizing = true;
            selectedArea.resizeCorner = 'bottomLeft';
            canvas.style.cursor = 'nesw-resize';
        } else if (isNearCorner(startX + selectedArea.width, startY + selectedArea.height, 'bottomRight', handleSize)) {
            selectedArea.isResizing = true;
            selectedArea.resizeCorner = 'bottomRight';
            canvas.style.cursor = 'nwse-resize';
        }
    } else {
        // Start a new selection
        selectedArea = {
            x: startX,
            y: startY,
            width: 0,
            height: 0,
            isResizing: false,
            resizeCorner: null
        };
    }
}

function endSelection(e) {
    if (!selectedArea) return;

    const canvasRect = canvas.getBoundingClientRect();
    const endX = (e.clientX - canvasRect.left - translateX) / scale;
    const endY = (e.clientY - canvasRect.top - translateY) / scale;

    if (!selectedArea.isResizing) {
        selectedArea.width = endX - startX;
        selectedArea.height = endY - startY;
    }

    // If the selection is too small, clear it
    if (Math.abs(selectedArea.width) < 5 || Math.abs(selectedArea.height) < 5) {
        selectedArea = null;
    } else {
        // Optionally, save the selection to Supabase
        // saveActionToSupabase({...selectedArea, type: 'select'});
    }

    // Reset resizing flag
    selectedArea.isResizing = false;
    selectedArea.resizeCorner = null;

    redrawCanvas();
}

function handleSelectionDrag(e) {
    if (!selectedArea) return;

    const canvasRect = canvas.getBoundingClientRect();
    const currentX = (e.clientX - canvasRect.left - translateX) / scale;
    const currentY = (e.clientY - canvasRect.top - translateY) / scale;

    if (selectedArea.isResizing) {
        // Handle resizing
        switch (selectedArea.resizeCorner) {
            case 'topLeft':
                selectedArea.x = currentX;
                selectedArea.y = currentY;
                selectedArea.width = startX - currentX;
                selectedArea.height = startY - currentY;
                break;
            case 'topRight':
                selectedArea.y = currentY;
                selectedArea.width = currentX - startX;
                selectedArea.height = startY - currentY;
                break;
            case 'bottomLeft':
                selectedArea.x = currentX;
                selectedArea.width = startX - currentX;
                selectedArea.height = currentY - startY;
                break;
            case 'bottomRight':
                selectedArea.width = currentX - startX;
                selectedArea.height = currentY - startY;
                break;
        }
    } else if (isDraggingSelection) {
        // Handle dragging
        selectedArea.x = currentX - selectionOffsetX;
        selectedArea.y = currentY - selectionOffsetY;
    } else {
        // Check if mouse is over a resize handle
        const handleSize = 5 / scale;
        if (isNearCorner(currentX, currentY, 'topLeft', handleSize)) {
            canvas.style.cursor = 'nwse-resize';
        } else if (isNearCorner(currentX, currentY, 'topRight', handleSize)) {
            canvas.style.cursor = 'nesw-resize';
        } else if (isNearCorner(currentX, currentY, 'bottomLeft', handleSize)) {
            canvas.style.cursor = 'nesw-resize';
        } else if (isNearCorner(currentX, currentY, 'bottomRight', handleSize)) {
            canvas.style.cursor = 'nwse-resize';
        } else if (ctx.isPointInPath(currentX, currentY)) {
            canvas.style.cursor = 'move';
        } else {
            canvas.style.cursor = 'default';
        }
    }

    redrawCanvas(); 
}

function deleteSelectedArea() {
    if (!selectedArea) return;

    // Clear the selected area on the canvas
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0); 
    ctx.clearRect(
        selectedArea.x * scale + translateX,
        selectedArea.y * scale + translateY,
        selectedArea.width * scale,
        selectedArea.height * scale
    );
    ctx.restore();

    // Remove the corresponding actions from history (you'll need to implement this based on your history structure)
    // history = history.filter(item => !isActionWithinSelection(item, selectedArea));
    // historyIndex = history.length - 1;

    // Clear the selection
    selectedArea = null;

    redrawCanvas();

    // You might also want to delete the selection from Supabase if you're storing it there
}

function isNearCorner(x, y, corner, handleSize) {
    switch (corner) {
        case 'topLeft':
            return Math.abs(x - selectedArea.x) < handleSize && Math.abs(y - selectedArea.y) < handleSize;
        case 'topRight':
            return Math.abs(x - (selectedArea.x + selectedArea.width)) < handleSize && Math.abs(y - selectedArea.y) < handleSize;
        case 'bottomLeft':
            return Math.abs(x - selectedArea.x) < handleSize && Math.abs(y - (selectedArea.y + selectedArea.height)) < handleSize;
        case 'bottomRight':
            return Math.abs(x - (selectedArea.x + selectedArea.width)) < handleSize && Math.abs(y - (selectedArea.y + selectedArea.height)) < handleSize;
    }
}

// ... (rest of the code)
    
      function handleSelectionDrag(e) {
        if (!selectedArea || !isDraggingSelection) return;
    
        const canvasRect = canvas.getBoundingClientRect();
        const currentX = (e.clientX - canvasRect.left - translateX) / scale;
        const currentY = (e.clientY - canvasRect.top - translateY) / scale;
    
        selectedArea.x = Math.min(startX, currentX);
        selectedArea.y = Math.min(startY, currentY);
        selectedArea.width = Math.abs(currentX - startX);
        selectedArea.height = Math.abs(currentY - startY);
    
        redrawCanvas();
      }
    
      function fillArea(e) {
        const canvasRect = canvas.getBoundingClientRect();
        const x = (e.clientX - canvasRect.left - translateX) / scale;
        const y = (e.clientY - canvasRect.top - translateY) / scale;
    
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixelData = imageData.data;
        const targetColor = getPixelColor(x, y);
    
        if (color === targetColor) return; // Avoid filling with the same color
    
        function getPixelColor(x, y) {
            const index = (y * imageData.width + x) * 4;
            return `rgba(${pixelData[index]}, ${pixelData[index + 1]}, ${pixelData[index + 2]}, ${pixelData[index + 3] / 255})`;
        }
    
        function floodFill(x, y) {
            if (x < 0 || x >= imageData.width || y < 0 || y >= imageData.height) return;
            if (getPixelColor(x, y) !== targetColor) return;
    
            setPixelColor(x, y);
    
            floodFill(x + 1, y);
            floodFill(x - 1, y);
            floodFill(x, y + 1);
            floodFill(x, y - 1);
        }
    
        function setPixelColor(x, y) {
            const index = (y * imageData.width + x) * 4;
            pixelData[index] = parseInt(color.slice(1, 3), 16); // Red
            pixelData[index + 1] = parseInt(color.slice(3, 5), 16); // Green
            pixelData[index + 2] = parseInt(color.slice(5, 7), 16); // Blue
            pixelData[index + 3] = 255; // Alpha (fully opaque)
        }
    
        floodFill(x, y);
        ctx.putImageData(imageData, 0, 0);
    
        // Save to Supabase
        saveActionToSupabase({ x, y, color, type: 'fill' });
    }
    
      async function saveActionToSupabase(actionData) {
        if (!actionData) {
          actionData = getActionData();
        }
    
        const { error } = await supabase
          .from('whiteboard_data')
          .insert([{ ...actionData, userId }]);
    
        if (error) console.error("Error saving to Supabase:", error);
      }
    
      function getActionData() {
        switch (currentTool) {
            case 'draw':
            case 'eraser':
                return {
                    x: startX,
                    y: startY,
                    color,
                    size: thickness,
                    type: currentTool
                };
            case 'text':
                // Get the actual text content and color from the text box element
                const textInput = document.querySelector('input[type="text"]'); // Assuming only one text box exists at a time
                const text = textInput ? textInput.value : ''; 
                const textColor = textInput ? textInput.style.color : color; // Fallback to default color if no text box
    
                return {
                    x: startX,
                    y: startY,
                    text,
                    font: 'Arial', 
                    color: textColor,
                    size: thickness,
                    type: 'text'
                };
            case 'select':
                return {
                    x: selectedArea.x,
                    y: selectedArea.y,
                    width: selectedArea.width,
                    height: selectedArea.height,
                    type: 'select'
                };
            // ... add cases for other tools as you implement them
            default:
                return {};
        }
    }
    
      function zoomIn() {
          scale *= 1.1;
          redrawCanvas();
      }
    
      function zoomOut() {
          scale /= 1.1;
          redrawCanvas();
      }
    
      // ... (Other tool functions implementation - you'll need to add these based on your specific requirements)
    
      window.validatePassword = validatePassword;}