'use client';

import { useState } from 'react';
import { Terminal } from 'lucide-react';

type Tab = 'local' | 'docker' | 'aws';

interface Line {
  prompt: string | null;
  cmd: string;
  color: string;
}

const LINES: Record<Tab, Line[]> = {
  local: [
    { prompt: '~', cmd: 'git clone https://github.com/ttang1024/Smart_CV', color: '#4ade80' },
    { prompt: '~', cmd: 'cd Smart_CV', color: '#4ade80' },
    { prompt: '~/Smart_CV/SmartCV.API', cmd: 'dotnet run', color: '#22d3ee' },
    { prompt: null, cmd: '✓ API -> http://localhost:5100', color: '#818cf8' },
    { prompt: '~/Smart_CV/SmartCV.Web', cmd: 'npm install && npm run dev', color: '#4ade80' },
    { prompt: null, cmd: '✓ Web -> http://localhost:3000', color: '#818cf8' },
  ],
  docker: [
    { prompt: '~', cmd: 'git clone https://github.com/ttang1024/Smart_CV', color: '#4ade80' },
    { prompt: '~', cmd: 'cd Smart_CV', color: '#4ade80' },
    { prompt: '~/Smart_CV', cmd: 'docker compose up --build -d', color: '#22d3ee' },
    { prompt: null, cmd: '✓ Containers started', color: '#818cf8' },
    { prompt: null, cmd: '✓ API -> http://localhost:5100', color: '#818cf8' },
    { prompt: null, cmd: '✓ Web -> http://localhost:3000', color: '#818cf8' },
  ],
  aws: [
    { prompt: '~', cmd: 'git clone https://github.com/ttang1024/Smart_CV', color: '#4ade80' },
    { prompt: '~', cmd: 'cd Smart_CV', color: '#4ade80' },
    { prompt: '~/Smart_CV', cmd: 'chmod +x deploy.sh && ./deploy.sh', color: '#22d3ee' },
    { prompt: null, cmd: '✓ Stack deployed to AWS', color: '#818cf8' },
    { prompt: null, cmd: '✓ API -> https://api.your-domain.com', color: '#818cf8' },
    { prompt: null, cmd: '✓ Web -> https://your-domain.com', color: '#818cf8' },
  ],
};

const TAB_LABELS: Record<Tab, string> = {
  local: 'Local',
  docker: 'Docker',
  aws: 'AWS',
};

const TABS: Tab[] = ['local', 'docker', 'aws'];

interface Props {
  labels?: Partial<Record<Tab, string>>;
}

export default function DeploymentTerminal({ labels }: Props) {
  const [active, setActive] = useState<Tab>('local');
  const lines = LINES[active];

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(0,0,0,1)', border: '1px solid rgba(74,222,128,0.2)', boxShadow: '0 0 40px rgba(74,222,128,0.06)' }}>
      <div className="flex items-center gap-2 px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
        <div className="w-3 h-3 rounded-full bg-red-500/70" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
        <div className="w-3 h-3 rounded-full bg-green-500/70" />
        <Terminal className="w-3.5 h-3.5 text-white/20 ml-2" />
        <span className="text-xs text-white/20 ml-1">bash</span>
        <div className="ml-auto flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActive(tab)}
              className="text-xs px-2.5 py-0.5 rounded-md font-semibold transition-all"
              style={active === tab
                ? { background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }
                : { background: 'transparent', color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.08)' }
              }
            >
              {labels?.[tab] ?? TAB_LABELS[tab]}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-5 font-mono text-sm space-y-2 min-h-[276px]">
        {lines.map((line, index) => (
          <div key={`${line.cmd}-${index}`} className="flex items-start gap-2">
            {line.prompt && <span className="shrink-0 text-white/25">{line.prompt} $</span>}
            <span className="break-all" style={{ color: line.color }}>{line.cmd}</span>
          </div>
        ))}
        <div className="flex items-center gap-1 mt-1">
          <span className="text-white/25">~ $</span>
          <span style={{ color: '#4ade80' }}>|</span>
        </div>
      </div>
    </div>
  );
}
