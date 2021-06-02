import React, { useState, useEffect } from 'react';
import Editor from './editor';
import { parseScript } from 'grater';

import './style.scss';

function App() {
  const [source, setSource] = useState('// Type anything you want');
  const [target, setTarget] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const r = parseScript(source);
      setTarget(JSON.stringify(r, null, 2));
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, [source]);

  return (
    <div className='app'>
      <div className='editor-wrap'>
        <Editor code={source} handleChange={(value) => setSource(value)} />
        <Editor className='ast-result' code={error ? '' : target} language='json' />
        {!!error && <div className='parse-error'>{error}</div>}
      </div>
    </div>
  );
}

export default App;
