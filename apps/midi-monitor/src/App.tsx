import MidiDeviceList from './components/MidiDeviceList';
import TransportPanel from './components/TransportPanel';
import './App.css';

function App() {
  return (
    <main className="app">
      <h1>Web MIDI Lab</h1>
      <MidiDeviceList />
      <TransportPanel />
    </main>
  );
}

export default App;
