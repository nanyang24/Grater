import React, { useRef } from 'react';
import MonacoEditor from 'react-monaco-editor';
import { useResizeDetector } from 'react-resize-detector';

const defaultOptions = {
  minimap: {
    enabled: false,
  },
};

export default function Editor({
  code,
  handleChange,
  language,
  options = {},
  className = '',
}) {
  const { width, height, ref } = useResizeDetector();

  const editorInstance = useRef();

  const onChange = (newValue, e) => {
    handleChange(newValue);
  };

  const editorDidMount = (editor, monaco) => {
    editorInstance.current = editor;

    if (handleChange) {
      editor.focus();
    }

    import('monaco-themes/themes/Solarized-dark.json').then((data) => {
      monaco.editor.defineTheme('monokai', data);
      monaco.editor.setTheme('monokai');
    });
  };

  return (
    <div className={`editor-content ${className}`} ref={ref}>
      <MonacoEditor
        width={width}
        height={height}
        language={language || 'javascript'}
        value={code || ''}
        quickSuggestions={false}
        options={{
          ...defaultOptions,
          ...{
            readOnly: !handleChange,
          },
          ...options,
        }}
        onChange={onChange}
        editorDidMount={editorDidMount}
      />
    </div>
  );
}
