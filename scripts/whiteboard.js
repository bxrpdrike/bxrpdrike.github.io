// Supabase setup
const SUPABASE_URL = 'https://jsorbpmakyqrjopxswzh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Impzb3JicG1ha3lxcmpvcHhzd3poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjQ5NTU1OTIsImV4cCI6MjA0MDUzMTU5Mn0.8RCd2J5Koxeqdxbf8cgqukApw-or2IN9kFC5zBTEAZs';
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Constants
const PASSWORD = 'skibidi';

// HTML Elements
const loginScreen = document.getElementById('login-screen');
const whiteboardContainer = document.getElementById('whiteboard-container');
const passwordInput = document.getElementById('password-input');
const errorMessage = document.getElementById('error-message');

const canvas = document.getElementById('whiteboard');
const ctx = canvas.getContext('2d');
let drawing = false;
let color = document.getElementById('color-picker').value;
let thickness = document.getElementById('thickness-slider').value;

// Tools
let currentTool = 'draw'; // 'draw' or 'text'

// Validate Password
function validatePassword() {
    if (!passwordInput.value) {
        errorMessage.textContent = 'Password cannot be empty.';
        return;
    }

    if (passwordInput.value === PASSWORD) {
        loginScreen.style.display = 'none';
        whiteboardContainer.style.display = 'block';
        initializeWhiteboard();
    } else {
        errorMessage.textContent = 'Incorrect password, try again.';
    }
}

// Initialize the whiteboard
function initializeWhiteboard() {
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mousemove', draw);
    document.getElementById('color-picker').addEventListener('input', (e) => color = e.target.value);
    document.getElementById('thickness-slider').addEventListener('input', (e) => thickness = e.target.value);

    document.getElementById('text-tool').addEventListener('click', () => currentTool = 'text');
    document.getElementById('draw-tool').addEventListener('click', () => currentTool = 'draw');
    
    loadWhiteboardData();
}

// Drawing functions
function startDrawing(e) {
    if (currentTool !== 'draw') return; // Only start drawing if the tool is set to 'draw'
    drawing = true;
    draw(e); // Start drawing immediately
}

function stopDrawing() {
    drawing = false;
    ctx.beginPath(); // Reset the drawing path
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
    try {
        const { data, error } = await supabase
            .from('whiteboard_data')
            .insert([
                { x: e.clientX - canvas.offsetLeft, y: e.clientY - canvas.offsetTop, color: color, size: thickness, type: 'draw' }
            ]);
        if (error) console.error('Error saving to Supabase:', error.message);
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}

// Load existing whiteboard data
async function loadWhiteboardData() {
    try {
        const { data, error } = await supabase
            .from('whiteboard_data')
            .select('*');
        
        if (error) {
            console.error('Error loading data:', error.message);
            return;
        }
        
        if (data) {
            data.forEach(item => {
                ctx.lineWidth = item.size;
                ctx.lineCap = 'round';
                ctx.strokeStyle = item.color;
                ctx.lineTo(item.x, item.y);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(item.x, item.y);
            });
        }
    } catch (err) {
        console.error('Unexpected error:', err);
    }
}
