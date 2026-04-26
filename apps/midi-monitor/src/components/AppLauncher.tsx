import { useMemo, useState } from 'react';
import MidiMonitorSection from './MidiMonitorSection';
import EightStepSequencerSection from './EightStepSequencerSection';
import TransportSchedulerDebug from './TransportSchedulerDebug';

type SectionId = 'midi-monitor' | 'eight-step' | 'transport-debug';

type Section = {
  id: SectionId;
  label: string;
};

const sections: Section[] = [
  { id: 'midi-monitor', label: 'MIDI Monitor' },
  { id: 'eight-step', label: '8-Step Sequencer' },
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
