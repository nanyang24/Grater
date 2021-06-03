import React, { useState, useEffect } from 'react';
import Editor from './editor';
import { parseScript } from 'grater';
import GithubIcon from './img/github.svg';

import './style.scss';

function App() {
  const [source, setSource] = useState('// Type anything you want');
  const [target, setTarget] = useState('');
  const [error, setError] = useState('');

  const handleSetStorage = (value) => {
    window.localStorage.setItem('grater-editor', value);
  };

  useEffect(() => {
    const existingString = window.localStorage.getItem('grater-editor');

    if (existingString) {
      setSource(existingString);
    }
  }, []);

  useEffect(() => {
    try {
      const r = parseScript(source);
      const formatString = JSON.stringify(r, null, 2);
      setTarget(formatString);
      handleSetStorage(source);
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }, [source]);

  return (
    <div className='app'>
      <header>
        <div className={'title'}>Grater</div>
        <div className={'desc'}>An ECMAScript Parser</div>
        <div className={'icon'}>
          <a href='https://github.com/nanyang24/Grater' target='__blank'>
            <img src={GithubIcon} alt='GithubIcon' />
          </a>
        </div>
      </header>
      <div className='editor-wrap'>
        <div className='editor-panel'>
          <div className={'editor-header'}>Source Code</div>
          <Editor code={source} handleChange={(value) => setSource(value)} />
        </div>
        <div className='editor-panel'>
          <div className={'editor-header'}>AST Output</div>
          <Editor
            className='ast-result'
            code={error ? '' : target}
            language='json'
          />
        </div>

        {!!error && <div className='parse-error'>{error}</div>}
      </div>
    </div>
  );
}

export default App;
