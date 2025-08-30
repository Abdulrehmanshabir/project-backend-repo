import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props){ super(props); this.state = { hasError:false, error:null }; }
  static getDerivedStateFromError(error){ return { hasError:true, error }; }
  componentDidCatch(error, info){ console.error('UI Error:', error, info); }
  render(){
    if (this.state.hasError) {
      return (
        <div style={{padding:16}}>
          <h2>Something went wrong.</h2>
          <pre style={{whiteSpace:'pre-wrap'}}>{this.state.error?.message || 'Unknown error'}</pre>
          <div style={{display:'flex',gap:8}}>
            <button className="btn" onClick={()=>window.location.reload()}>Reload</button>
            <button className="btn" onClick={()=>window.location.assign('/')}>Go Home</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

