console.log("✅ content.js injected");
let currentMode = 'habit'; 

chrome.storage.sync.get(['mode'], (data) => {
  if (data.mode) {
    currentMode = data.mode;
    console.log("🧠 Current mode:", currentMode);
  }
  
});
let activeInput = null;
let isSyncing = false; 


const virtualBox = document.createElement('textarea');
const toolbar = document.createElement('div');
Object.assign(toolbar.style, {
  display: 'none',
  marginTop: '8px',
  textAlign: 'right',
});

const summarizeBtn = document.createElement('button');
summarizeBtn.textContent = 'Summarize';
summarizeBtn.style.marginRight = '8px';

const fixGrammarBtn = document.createElement('button');
fixGrammarBtn.textContent = 'Fix Grammar';

[ summarizeBtn, fixGrammarBtn ].forEach((btn) => {
  Object.assign(btn.style, {
    padding: '5px 10px',
    fontSize: '14px',
    cursor: 'pointer',
    marginLeft: '5px',
  });
  toolbar.appendChild(btn);
});

virtualBox.insertAdjacentElement('afterend', toolbar);

virtualBox.id = 'customInputBox';
virtualBox.placeholder = 'Type here...';
Object.assign(virtualBox.style, {
  position: 'fixed',
  left: 'auto',  
  top: 'auto',
  bottom: '20px',
  right: '20px',
  width: '300px',
  height: '100px',
  fontSize: '16px',
  zIndex: '999999',
  padding: '10px',
  backgroundColor: '#fff',
  border: '1px solid #ccc',
  borderRadius: '8px',
  display: 'none',
  boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)',
  resize: 'both',
  overflow: 'auto',
});

document.body.appendChild(virtualBox);

let isDragging = false;
let offsetX = 0;
let offsetY = 0;

virtualBox.addEventListener('mousedown', (e) => {
  isDragging = true;
  offsetX = e.clientX - virtualBox.offsetLeft;
  offsetY = e.clientY - virtualBox.offsetTop;
  virtualBox.style.cursor = 'move';
});

document.addEventListener('mousemove', (e) => {
  if (isDragging) {
    virtualBox.style.left = `${e.clientX - offsetX}px`;
    virtualBox.style.top = `${e.clientY - offsetY}px`;
    virtualBox.style.right = 'auto';
    virtualBox.style.bottom = 'auto';
  }
});

document.addEventListener('mouseup', () => {
  isDragging = false;
  virtualBox.style.cursor = 'text';
});


document.addEventListener('focusin', (e) => {
  if (currentMode === 'advanced') {
  toolbar.style.display = 'block';
} else {
  toolbar.style.display = 'none';
}
  if (
    e.target !== virtualBox &&
    (e.target.tagName === 'TEXTAREA' ||
      (e.target.tagName === 'INPUT' && ['text', 'search', 'email'].includes(e.target.type)))
  ) {
    activeInput = e.target;
    virtualBox.value = activeInput.value;
    virtualBox.style.display = 'block';
  }
});


virtualBox.addEventListener('input', () => {
  if (!activeInput || isSyncing) return;
  isSyncing = true;

  activeInput.value = virtualBox.value;
  activeInput.dispatchEvent(new Event('input', { bubbles: true }));

  isSyncing = false;
});


document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    virtualBox.style.display = 'none';
    activeInput = null;
  }
});
summarizeBtn.addEventListener('click', () => {
  virtualBox.value = '[Summary] ' + virtualBox.value.slice(0, 50) + '...';
  virtualBox.dispatchEvent(new Event('input', { bubbles: true }));
});

fixGrammarBtn.addEventListener('click', () => {
  virtualBox.value = virtualBox.value.replace(/\bi\b/g, 'I'); // dumb fix
  virtualBox.dispatchEvent(new Event('input', { bubbles: true }));
});
