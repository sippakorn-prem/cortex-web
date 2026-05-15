/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CORTEX_MCP_URL?: string;
  readonly VITE_CORTEX_MCP_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace JSX {
  interface IntrinsicElements {
    'image-slot': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        id?: string;
        shape?: 'rect' | 'rounded' | 'circle' | 'pill';
        placeholder?: string;
        src?: string;
      },
      HTMLElement
    >;
  }
}
