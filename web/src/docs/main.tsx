import { createRoot } from 'react-dom/client';
import Docs from './Docs';
import '../style.css';
import '../site-theme.css';
import './docs.css';
createRoot(document.getElementById('root')!).render(<Docs />);
