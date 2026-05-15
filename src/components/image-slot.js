// Minimal <image-slot> custom element. Drop an image to fill; persists to
// localStorage. Round/rect shapes via `shape` attr. No reframe/crop UI —
// the design-tool sidecar persistence path is replaced with localStorage.
const STORAGE_PREFIX = 'cx-image-slot:';
const ACCEPT = ['image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif'];
class ImageSlot extends HTMLElement {
    slotId = '';
    shape = 'rounded';
    placeholder = 'Drop an image';
    root;
    imgEl;
    hintEl;
    fileInput;
    static get observedAttributes() {
        return ['id', 'shape', 'placeholder', 'src'];
    }
    connectedCallback() {
        this.slotId = this.getAttribute('id') || '';
        this.shape = this.getAttribute('shape') || 'rounded';
        this.placeholder = this.getAttribute('placeholder') || 'Drop an image';
        if (!this.shadowRoot)
            this.root = this.attachShadow({ mode: 'open' });
        else
            this.root = this.shadowRoot;
        this.render();
        this.wireEvents();
        this.loadPersisted();
    }
    attributeChangedCallback() {
        if (this.root) {
            this.shape = this.getAttribute('shape') || 'rounded';
            this.placeholder = this.getAttribute('placeholder') || 'Drop an image';
            if (this.hintEl)
                this.hintEl.textContent = this.placeholder;
            this.applyShape();
        }
    }
    render() {
        const radius = this.shape === 'circle' ? '50%' : this.shape === 'pill' ? '999px' : this.shape === 'rect' ? '0' : '12px';
        this.root.innerHTML = `
      <style>
        :host {
          display: inline-block;
          position: relative;
          overflow: hidden;
          border-radius: ${radius};
          cursor: pointer;
          background: #181715;
          width: 100%;
          height: 100%;
        }
        .img {
          position: absolute; inset: 0;
          background-size: cover;
          background-position: 50% 50%;
          background-repeat: no-repeat;
        }
        .hint {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Geist Mono', ui-monospace, monospace;
          font-size: 10px;
          letter-spacing: 0.08em;
          color: #6E6A62;
          border: 1px dashed #2a2824;
          border-radius: inherit;
          text-align: center;
          padding: 4px;
          pointer-events: none;
        }
        :host(.has-image) .hint { display: none; }
        :host(.dragover) { outline: 1px solid oklch(0.72 0.12 60); outline-offset: 2px; }
        input { display: none; }
      </style>
      <div class="img"></div>
      <div class="hint">${this.placeholder}</div>
      <input type="file" accept="${ACCEPT.join(',')}" />
    `;
        this.imgEl = this.root.querySelector('.img');
        this.hintEl = this.root.querySelector('.hint');
        this.fileInput = this.root.querySelector('input');
        this.applyShape();
    }
    applyShape() {
        const radius = this.shape === 'circle' ? '50%' : this.shape === 'pill' ? '999px' : this.shape === 'rect' ? '0' : '12px';
        this.style.borderRadius = radius;
    }
    wireEvents() {
        this.addEventListener('click', () => this.fileInput.click());
        this.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.classList.add('dragover');
        });
        this.addEventListener('dragleave', () => this.classList.remove('dragover'));
        this.addEventListener('drop', (e) => {
            e.preventDefault();
            this.classList.remove('dragover');
            const f = e.dataTransfer?.files?.[0];
            if (f)
                this.consumeFile(f);
        });
        this.fileInput.addEventListener('change', () => {
            const f = this.fileInput.files?.[0];
            if (f)
                this.consumeFile(f);
        });
    }
    async consumeFile(f) {
        if (!ACCEPT.includes(f.type))
            return;
        const data = await this.fileToDataURL(f);
        this.setImage(data);
        if (this.slotId) {
            try {
                localStorage.setItem(STORAGE_PREFIX + this.slotId, data);
            }
            catch {
                // quota — silently drop
            }
        }
    }
    fileToDataURL(f) {
        return new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(r.result);
            r.onerror = reject;
            r.readAsDataURL(f);
        });
    }
    setImage(url) {
        this.imgEl.style.backgroundImage = `url("${url}")`;
        this.classList.add('has-image');
    }
    loadPersisted() {
        if (!this.slotId) {
            const src = this.getAttribute('src');
            if (src)
                this.setImage(src);
            return;
        }
        const v = localStorage.getItem(STORAGE_PREFIX + this.slotId);
        if (v)
            this.setImage(v);
        else {
            const src = this.getAttribute('src');
            if (src)
                this.setImage(src);
        }
    }
}
if (!customElements.get('image-slot')) {
    customElements.define('image-slot', ImageSlot);
}
export {};
