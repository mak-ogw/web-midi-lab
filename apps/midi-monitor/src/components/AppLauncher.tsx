import { useMemo, useState } from 'react';
import MidiMonitorSection from './MidiMonitorSection';
import EightStepSequencerSection from './EightStepSequencerSection';
import TransportSchedulerDebug from './TransportSchedulerDebug';
import EuclideanSequencer from '../../../euclidean-harmony-sequencer/src/components/EuclideanSequencer';
import '../../../euclidean-harmony-sequencer/src/App.css';

type SectionId = 'midi-monitor' | 'eight-step' | 'transport-debug' | 'euclidean-harmony-sequencer';

type Section = {
  id: SectionId;
  label: string;
};

const sections: Section[] = [
  { id: 'midi-monitor', label: 'MIDI Monitor' },
  { id: 'eight-step', label: '8-Step Sequencer' },
  { id: 'euclidean-harmony-sequencer', label: 'Euclidean Harmony Sequencer' },
  { id: 'transport-debug', label: 'Transport / Scheduler Debug' },
];

export default function AppLauncher() {
  const [activeSection, setActiveSection] = useState<SectionId>('midi-monitor');

  const activeContent = useMemo(() => {
    if (activeSection === 'midi-monitor') {
      return <MidiMonitorSection />;
    }

    if (activeSection === 'eight-step') {
      return <EightStepSequencerSection />;
    }

    if (activeSection === 'euclidean-harmony-sequencer') {
      return (
        <section className="midi-panel">
          <h2>Euclidean Harmony Sequencer</h2>
          <EuclideanSequencer />
        </section>
      );
    }

    return <TransportSchedulerDebug />;
  }, [activeSection]);

  return (
    <>
      <section className="midi-panel">
        <h2>App Launcher</h2>
        <p>Select a section:</p>
        <div className="launcher-nav" role="tablist" aria-label="Web MIDI Lab sections">
          {sections.map((section) => {
            const isActive = section.id === activeSection;

            return (
              <button
                key={section.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={isActive ? 'is-active' : ''}
                onClick={() => {
                  setActiveSection(section.id);
                }}
              >
                {section.label}
              </button>
            );
          })}
        </div>
      </section>

      {activeContent}
    </>
  );
}
