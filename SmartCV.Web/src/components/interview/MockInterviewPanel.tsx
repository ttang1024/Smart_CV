import { AlertCircle, Award, CheckCircle2, Mic, MicOff, RefreshCw, Send, ThumbsUp, Wrench } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import type { Resume } from '../../types/resume';
import type { MockAnswerEvaluation, MockInterviewTurn } from '../../services/ai/aiService';
import { evaluateMockAnswer, startMockInterview } from '../../services/ai/aiService';
import { useSettingsStore } from '../../store/settingsStore';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';

interface MockInterviewPanelProps {
  resume: Resume;
  jobContext?: {
    jobTitle: string;
    company: string;
    jobDescription: string;
  };
  onJobContextChange?: (updates: Partial<{ jobTitle: string; company: string; jobDescription: string }>) => void;
}

type Focus = 'mixed' | 'behavioral' | 'technical';
type Difficulty = 'gentle' | 'standard' | 'tough';

// Minimal typing for the (vendor-prefixed) Web Speech API — avoids a hard dependency.
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
}

function getSpeechRecognition(): SpeechRecognitionLike | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike; webkitSpeechRecognition?: new () => SpeechRecognitionLike };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export default function MockInterviewPanel({ resume, jobContext, onJobContextChange }: MockInterviewPanelProps) {
  const { getActiveConfig, aiSettings } = useSettingsStore();
  const [jobTitle, setJobTitleState] = useState(jobContext?.jobTitle || resume.targetJob || '');
  const [company, setCompanyState] = useState(jobContext?.company ?? '');
  const [jobDescription, setJobDescriptionState] = useState(jobContext?.jobDescription ?? '');
  const [focus, setFocus] = useState<Focus>('mixed');
  const [difficulty, setDifficulty] = useState<Difficulty>('standard');

  const [started, setStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [history, setHistory] = useState<MockInterviewTurn[]>([]);
  const [evaluations, setEvaluations] = useState<MockAnswerEvaluation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const speechSupported = useRef<boolean>(false);

  const activeProvider = aiSettings.activeProvider;
  const config = getActiveConfig();
  const mockConfig = { resume, jobTitle, company, jobDescription, focus, difficulty };

  useEffect(() => {
    speechSupported.current = getSpeechRecognition() !== null;
    return () => recognitionRef.current?.stop();
  }, []);

  const setJobTitle = (value: string) => { setJobTitleState(value); onJobContextChange?.({ jobTitle: value }); };
  const setCompany = (value: string) => { setCompanyState(value); onJobContextChange?.({ company: value }); };
  const setJobDescription = (value: string) => { setJobDescriptionState(value); onJobContextChange?.({ jobDescription: value }); };

  const toggleDictation = useCallback(() => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const recognition = getSpeechRecognition();
    if (!recognition) {
      toast.error('Voice input is not supported in this browser');
      return;
    }
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.continuous = true;
    recognition.onresult = event => {
      let text = '';
      for (let i = 0; i < event.results.length; i++) {
        text += event.results[i][0].transcript;
      }
      setAnswer(prev => (prev ? `${prev} ${text}` : text).trim());
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [listening]);

  const handleStart = async () => {
    if (!config) {
      setError(`No API key configured for ${activeProvider}. Go to Settings.`);
      return;
    }
    setLoading(true);
    setError(null);
    setHistory([]);
    setEvaluations([]);
    try {
      const question = await startMockInterview(config.provider, config.apiKey, config.model, mockConfig);
      setCurrentQuestion(question);
      setStarted(true);
      setAnswer('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start the interview');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!config || !answer.trim()) return;
    if (listening) { recognitionRef.current?.stop(); }
    setLoading(true);
    setError(null);
    try {
      const evaluation = await evaluateMockAnswer(
        config.provider, config.apiKey, config.model,
        mockConfig, history, currentQuestion, answer.trim(),
      );
      setHistory(prev => [...prev, { question: currentQuestion, answer: answer.trim() }]);
      setEvaluations(prev => [...prev, evaluation]);
      setCurrentQuestion(evaluation.followUp || currentQuestion);
      setAnswer('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not evaluate your answer');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    recognitionRef.current?.stop();
    setStarted(false);
    setCurrentQuestion('');
    setAnswer('');
    setHistory([]);
    setEvaluations([]);
    setError(null);
  };

  const avgScore = evaluations.length > 0
    ? Math.round(evaluations.reduce((sum, e) => sum + e.score, 0) / evaluations.length)
    : null;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-rose-50 to-amber-50 dark:from-rose-950/30 dark:to-amber-950/30">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Mock Interview</h2>
          {avgScore !== null && (
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Avg {avgScore}/100</span>
          )}
          <Badge variant="purple" className="ml-auto">{activeProvider.toUpperCase()}</Badge>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4">
          {!started && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Job Title" value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
                <Input placeholder="Company" value={company} onChange={e => setCompany(e.target.value)} />
              </div>
              <Textarea
                placeholder="Paste the job description for sharper questions..."
                value={jobDescription}
                onChange={e => setJobDescription(e.target.value)}
                rows={4}
              />
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs space-y-1">
                  <span className="text-gray-500 dark:text-gray-400">Focus</span>
                  <select
                    className="w-full h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 text-sm"
                    value={focus}
                    onChange={e => setFocus(e.target.value as Focus)}
                  >
                    <option value="mixed">Mixed</option>
                    <option value="behavioral">Behavioral</option>
                    <option value="technical">Technical</option>
                  </select>
                </label>
                <label className="text-xs space-y-1">
                  <span className="text-gray-500 dark:text-gray-400">Difficulty</span>
                  <select
                    className="w-full h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 text-sm"
                    value={difficulty}
                    onChange={e => setDifficulty(e.target.value as Difficulty)}
                  >
                    <option value="gentle">Gentle</option>
                    <option value="standard">Standard</option>
                    <option value="tough">Tough</option>
                  </select>
                </label>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span className="break-words min-w-0">{error}</span>
            </div>
          )}

          {!started ? (
            <Button className="w-full" loading={loading} onClick={handleStart}>
              <Mic className="w-4 h-4" />
              {loading ? 'Preparing...' : 'Start Interview'}
            </Button>
          ) : (
            <>
              {/* Current question */}
              <div className="rounded-lg border border-rose-200 dark:border-rose-800/60 bg-rose-50/60 dark:bg-rose-950/20 p-3">
                <p className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase tracking-wide mb-1">
                  Question {history.length + 1}
                </p>
                <p className="text-sm text-gray-900 dark:text-white leading-relaxed">{currentQuestion}</p>
              </div>

              <div className="relative">
                <Textarea
                  placeholder="Type or dictate your answer..."
                  value={answer}
                  onChange={e => setAnswer(e.target.value)}
                  rows={5}
                />
                <button
                  type="button"
                  onClick={toggleDictation}
                  title={listening ? 'Stop dictation' : 'Dictate answer'}
                  className={`absolute bottom-2 right-2 p-1.5 rounded-md transition-colors ${listening
                    ? 'bg-rose-500 text-white animate-pulse'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-rose-500'}`}
                >
                  {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1" loading={loading} onClick={handleSubmit} disabled={!answer.trim()}>
                  <Send className="w-4 h-4" />
                  {loading ? 'Scoring...' : 'Submit Answer'}
                </Button>
                <Button variant="secondary" size="icon" onClick={handleReset} title="End and reset">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>

              {/* Past turns with scorecards, newest first */}
              {evaluations.length > 0 && (
                <div className="space-y-4 pt-2">
                  {evaluations.map((evaluation, index) => (
                    <div key={index} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-3">
                      <div className="flex items-start gap-2">
                        <Award className="w-4 h-4 mt-0.5 text-amber-500 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Q{index + 1}: {history[index]?.question}</p>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{evaluation.verdict}</p>
                        </div>
                        <span className={`text-sm font-bold shrink-0 ${evaluation.score >= 75 ? 'text-emerald-600' : evaluation.score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                          {evaluation.score}
                        </span>
                      </div>

                      {evaluation.strengths.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 mb-1">
                            <ThumbsUp className="w-3 h-3" /> Strengths
                          </p>
                          <ul className="space-y-1">
                            {evaluation.strengths.map((s, i) => (
                              <li key={i} className="text-xs text-gray-700 dark:text-gray-300 flex gap-1.5">
                                <CheckCircle2 className="w-3 h-3 mt-0.5 text-emerald-500 shrink-0" />{s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {evaluation.improvements.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1 mb-1">
                            <Wrench className="w-3 h-3" /> Improve
                          </p>
                          <ul className="space-y-1">
                            {evaluation.improvements.map((s, i) => (
                              <li key={i} className="text-xs text-gray-700 dark:text-gray-300 flex gap-1.5">
                                <span className="text-amber-500">→</span>{s}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {evaluation.modelAnswer && (
                        <details className="group">
                          <summary className="text-xs font-medium text-sky-600 dark:text-sky-400 cursor-pointer select-none">
                            Show model answer
                          </summary>
                          <p className="mt-1.5 p-2 rounded bg-sky-50 dark:bg-sky-950/20 text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                            {evaluation.modelAnswer}
                          </p>
                        </details>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
