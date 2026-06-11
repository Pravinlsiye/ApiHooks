import { render } from 'solid-js/web';
import App from './components/App';
import './styles/styles.css';

const root = document.getElementById('root');
if (root) {
    render(() => <App />, root);
}
