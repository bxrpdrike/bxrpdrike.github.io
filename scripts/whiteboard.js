window.onload = function() {
    const SUPABASE_URL = 'https://jsorbpmakyqrjopxswzh.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impzb3JicG1ha3lxcmpvcHhzd3poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ5NTU1OTIsImV4cCI6MjA0MDUzMTU5Mn0.8RCd2J5Koxeqdxbf8cgqukApw-or2IN9kFC5zBTEAZs';
    const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    console.log("Supabase client initialized:", supabase);

    const PASSWORD = 'skibidi';
    let nickname = '';
    
    const loginScreen = document.getElementById('login-screen');
    const whiteboardContainer = document.getElementById('whiteboard-container');
    const passwordInput = document.getElementById('password-input');
    const nicknameInput = document.getElementById('nickname-input');
    const errorMessage = document.getElementById('error-message');

    const canvas = document.getElementById('whiteboard');
    const ctx = canvas.getContext('2d');
    let drawing = false;
    let color = document.getElementById('color-picker').value;
    let thickness = document.getElementById('thickness-slider').value;
    let currentTool = 'draw';

    const undoStack = [];
    const redoStack = [];

    function validatePassword() {
        console.log("Password validation called");
        if (!passwordInput.value) {
            errorMessage.textContent = 'Password cannot be empty.';
            return;
        }

        if (passwordInput.value === PASSWORD) {
            nickname = nicknameInput.value || 'Guest';
            loginScreen.style.display = 'none';
            whiteboardContainer.style.display = 'block';
            initializeWhiteboard();
        } else {
            errorMessage.textContent = 'Incorrect password, try again.';
        }
    }

    function initializeWhiteboard() {
        console.log("Initializing whiteboard...");
        canvas.width = window.innerWidth;  // Set canvas to the full width
        canvas.height = window.innerHeight; // Set canvas to the full height
        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mousemove', draw);
        document.getElementById('color-picker').addEventListener('change', (e) => color = e.target.value);
        document.getElementById('thickness-slider').addEventListener('change', (e) => thickness = e.target.value);

        document.getElementById('text-tool').addEventListener('click', () => currentTool = 'text');
        document.getElementById('draw-tool').addEventListener('click', () => currentTool = 'draw');
        document.getElementById('eraser-tool').addEventListener('click', () => currentTool = 'eraser');
        document.getElementById('undo-button').addEventListener('click', undoAction);
        document.getElementById('redo-button').addEventListener('click', redoAction);
        document.getElementById('zoom-in').addEventListener('click', zoomIn);
        document.getElementById('zoom-out').addEventListener('click', zoomOut);

        loadWhiteboardData();
        subscribeToRealTimeUpdates();
    }

    function startDrawing(e) {
        drawing = true;
        if (currentTool === 'draw') draw(e);
    }

    function stopDrawing() {
        drawing = false;
        ctx.beginPath();
    }

    async function draw(e) {
        if (!drawing || currentTool !== 'draw') return;
        ctx.lineWidth = thickness;
        ctx.lineCap = 'round';
        ctx.strokeStyle = color;

        ctx.lineTo(e.clientX - canvas.offsetLeft, e.clientY - canvas.offsetTop);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(e.clientX - canvas.offsetLeft, e.clientY - canvas.offsetTop);

        // Save to Supabase
        const { data, error } = await supabase
            .from('whiteboard_data')
            .insert([
                { x: e.clientX - canvas.offsetLeft, y: e.clientY - canvas.offsetTop, color: color, size: thickness, type: 'draw' }
            ]);

        if (error) console.error("Error saving to Supabase:", error);
        if (data) console.log("Data saved to Supabase:", data);
    }

    async function loadWhiteboardData() {
        console.log("Loading whiteboard data...");
        const { data, error } = await supabase
            .from('whiteboard_data')
            .select('*');

        if (data) {
            console.log("Data loaded from Supabase:", data);
            data.forEach(item => drawFromData(item));
        } else if (error) {
            console.error("Error loading data from Supabase:", error);
        }
    }

    function drawFromData(item) {
        ctx.lineWidth = item.size;
        ctx.lineCap = 'round';
        ctx.strokeStyle = item.color;
        ctx.lineTo(item.x, item.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(item.x, item.y);
    }

    function subscribeToRealTimeUpdates() {
        console.log("Subscribing to real-time updates...");
        supabase
            .from('whiteboard_data')
            .on('INSERT', payload => {
                console.log("Real-time update received:", payload);
                drawFromData(payload.new);
            })
            .subscribe();
    }

    window.validatePassword = validatePassword;
};
