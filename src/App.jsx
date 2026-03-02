import React, { useState, useEffect, useMemo } from 'react';
// --- CRUCIAL: Uncomment the line below in your VS Code ---
import './index.css'; 

import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  CheckCircle2, Circle, ChevronDown, ChevronUp, Plus, Trash2, BookOpen, Target, TrendingUp, BarChart3, Loader2
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, onSnapshot, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

// --- Default Syllabus Template ---
const DEFAULT_SYLLABUS = [
  {
    id: 'qa_arithmetic',
    name: 'Quantitative Reasoning - Arithmetic',
    subtopics: [
      { id: 'qa_ar_1', name: 'Multiples and Factors', theoryDone: false, practiceDone: false },
      { id: 'qa_ar_2', name: 'Number Properties', theoryDone: false, practiceDone: false },
      { id: 'qa_ar_3', name: 'Fractions', theoryDone: false, practiceDone: false },
      { id: 'qa_ar_4', name: 'Decimals', theoryDone: false, practiceDone: false },
      { id: 'qa_ar_5', name: 'Percentage', theoryDone: false, practiceDone: false },
      { id: 'qa_ar_6', name: 'Power and Roots', theoryDone: false, practiceDone: false },
      { id: 'qa_ar_7', name: 'Average', theoryDone: false, practiceDone: false },
      { id: 'qa_ar_8', name: 'Probability', theoryDone: false, practiceDone: false },
      { id: 'qa_ar_9', name: 'Set Theory', theoryDone: false, practiceDone: false },
      { id: 'qa_ar_10', name: 'Mixtures and allegations', theoryDone: false, practiceDone: false },
      { id: 'qa_ar_11', name: 'Ratio and proportion', theoryDone: false, practiceDone: false },
      { id: 'qa_ar_12', name: 'Descriptive Statistics', theoryDone: false, practiceDone: false },
      { id: 'qa_ar_13', name: 'Pipes, cisterns, and work time', theoryDone: false, practiceDone: false },
      { id: 'qa_ar_14', name: 'Speed, time, distance', theoryDone: false, practiceDone: false },
      { id: 'qa_ar_15', name: 'Simple and Compounded Interest', theoryDone: false, practiceDone: false }
    ]
  },
  {
    id: 'qa_algebra',
    name: 'Quantitative Reasoning - Algebra',
    subtopics: [
      { id: 'qa_al_1', name: 'Monomials, polynomials', theoryDone: false, practiceDone: false },
      { id: 'qa_al_2', name: 'Functions', theoryDone: false, practiceDone: false },
      { id: 'qa_al_3', name: 'Exponents', theoryDone: false, practiceDone: false },
      { id: 'qa_al_4', name: 'Quadratic equations', theoryDone: false, practiceDone: false },
      { id: 'qa_al_5', name: 'Inequalities and basic statistics', theoryDone: false, practiceDone: false },
      { id: 'qa_al_6', name: 'Algebraic expressions and equations', theoryDone: false, practiceDone: false },
      { id: 'qa_al_7', name: 'Permutation and combination', theoryDone: false, practiceDone: false },
      { id: 'qa_al_8', name: 'Progressions', theoryDone: false, practiceDone: false }
    ]
  },
  {
    id: 'verbal',
    name: 'Verbal Reasoning',
    subtopics: [
      { id: 'v_cr', name: 'Critical Reasoning', theoryDone: false, practiceDone: false },
      { id: 'v_rc', name: 'Reading Comprehension', theoryDone: false, practiceDone: false }
    ]
  },
  {
    id: 'di',
    name: 'Data Insights',
    subtopics: [
      { id: 'di_ds', name: 'Data Sufficiency', theoryDone: false, practiceDone: false },
      { id: 'di_gi', name: 'Graphic Interpretation', theoryDone: false, practiceDone: false },
      { id: 'di_ta', name: 'Table Analysis', theoryDone: false, practiceDone: false },
      { id: 'di_tpa', name: 'Two-Part Analysis', theoryDone: false, practiceDone: false },
      { id: 'di_msr', name: 'Multi-Source Reasoning', theoryDone: false, practiceDone: false }
    ]
  }
];

// --- Firebase Initialization ---
const firebaseConfig = {
  apiKey: "AIzaSyCzh55Ai7SgC80bKR6tSWJTIjFjzFD8J2Q",
  authDomain: "gmat-tracker-f3de2.firebaseapp.com",
  projectId: "gmat-tracker-f3de2",
  storageBucket: "gmat-tracker-f3de2.firebasestorage.app",
  messagingSenderId: "486760083129",
  appId: "1:486760083129:web:0e4abfcc95a66c4fb8b568",
  measurementId: "G-VSTCHYQTWZ"
};

let app, auth, db, analytics, appId;
try {
  app = initializeApp(firebaseConfig);
  analytics = getAnalytics(app);
  auth = getAuth(app);
  db = getFirestore(app);
  appId = 'gmat-tracker-local'; 
} catch (e) {
  console.error("Firebase initialization error:", e);
}

// --- Main Component ---
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('topics'); 
  
  // Data States
  const [targetScore, setTargetScore] = useState(705); 
  const [syllabus, setSyllabus] = useState(DEFAULT_SYLLABUS);
  const [mocks, setMocks] = useState([]);

  // UI States
  const [expandedTopics, setExpandedTopics] = useState(['qa_arithmetic', 'qa_algebra', 'verbal', 'di']);
  
  const getLocalYYYYMMDD = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };
  const [mockForm, setMockForm] = useState({ name: '', date: getLocalYYYYMMDD(), score: '' });

  // 1. Auth Setup & Styling Fix
  useEffect(() => {
    // --- EMERGENCY STYLING FIX ---
    // This injects Tailwind directly into the page if the local build fails.
    if (typeof document !== 'undefined') {
      const tailwindScript = document.createElement('script');
      tailwindScript.src = "https://cdn.tailwindcss.com";
      document.head.appendChild(tailwindScript);
    }

    if (!auth) return;
    const initAuth = async () => {
      try { await signInAnonymously(auth); } 
      catch (err) { console.error("Auth error:", err); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (!u) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Data Fetching
  useEffect(() => {
    if (!user || !db) return;
    setLoading(true);
    const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data');
    getDoc(profileRef).then((docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.syllabus) setSyllabus(data.syllabus);
        if (data.targetScore !== undefined) setTargetScore(data.targetScore);
      } else {
        setDoc(profileRef, { targetScore: 705, syllabus: DEFAULT_SYLLABUS });
      }
      setLoading(false);
    }).catch(err => {
      console.error("Error fetching profile:", err);
      setLoading(false);
    });
    const mocksRef = collection(db, 'artifacts', appId, 'users', user.uid, 'mocks');
    const unsubMocks = onSnapshot(mocksRef, (snap) => {
      const fetchedMocks = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      fetchedMocks.sort((a, b) => new Date(a.date) - new Date(b.date));
      setMocks(fetchedMocks);
    }, (err) => console.error("Mocks listener error:", err));
    return () => unsubMocks();
  }, [user]);

  // --- Handlers ---
  const saveProfileData = async (newSyllabus, newTarget) => {
    if (!user || !db) return;
    const profileRef = doc(db, 'artifacts', appId, 'users', user.uid, 'profile', 'data');
    try {
      const safeTarget = parseInt(newTarget) || 0;
      await setDoc(profileRef, { syllabus: newSyllabus, targetScore: safeTarget }, { merge: true });
    } catch (err) { console.error("Error saving profile:", err); }
  };

  const toggleSubtopic = (topicId, subtopicId, field) => {
    const newSyllabus = syllabus.map(topic => {
      if (topic.id !== topicId) return topic;
      return {
        ...topic,
        subtopics: topic.subtopics.map(sub => {
          if (sub.id !== subtopicId) return sub;
          return { ...sub, [field]: !sub[field] };
        })
      };
    });
    setSyllabus(newSyllabus);
    saveProfileData(newSyllabus, targetScore);
  };

  const handleTargetScoreChange = (e) => {
    const val = e.target.value;
    setTargetScore(val === '' ? '' : parseInt(val));
  };

  const saveTargetScoreBlur = () => saveProfileData(syllabus, targetScore);

  const handleAddMock = async (e) => {
    e.preventDefault();
    if (!user || !db || !mockForm.date || !mockForm.score) return;
    const mocksRef = collection(db, 'artifacts', appId, 'users', user.uid, 'mocks');
    try {
      await addDoc(mocksRef, {
        name: mockForm.name || `Mock ${mocks.length + 1}`,
        date: mockForm.date,
        score: parseInt(mockForm.score),
        createdAt: serverTimestamp()
      });
      setMockForm({ name: '', date: getLocalYYYYMMDD(), score: '' });
    } catch (err) { console.error("Error adding mock:", err); }
  };

  const handleDeleteMock = async (id) => {
    if (!user || !db) return;
    try { await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'mocks', id)); } 
    catch (err) { console.error("Error deleting mock:", err); }
  };

  const toggleAccordion = (id) => {
    setExpandedTopics(prev => 
      prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
    );
  };

  // --- Analytics ---
  const syllabusAnalytics = useMemo(() => {
    let totalSubtopics = 0, theoryDoneCount = 0, practiceDoneCount = 0, fullyDoneCount = 0, untouchedCount = 0, partialCount = 0, categoryStats = [];
    syllabus.forEach(topic => {
      let catTotal = 0, catTheory = 0, catPractice = 0;
      topic.subtopics.forEach(sub => {
        totalSubtopics++; catTotal++;
        if (sub.theoryDone) { theoryDoneCount++; catTheory++; }
        if (sub.practiceDone) { practiceDoneCount++; catPractice++; }
        if (sub.theoryDone && sub.practiceDone) fullyDoneCount++;
        else if (sub.theoryDone || sub.practiceDone) partialCount++;
        else untouchedCount++;
      });
      let shortName = topic.name;
      if (topic.id === 'qa_arithmetic') shortName = 'QA: Arithmetic';
      if (topic.id === 'qa_algebra') shortName = 'QA: Algebra';
      if (topic.id === 'verbal') shortName = 'Verbal';
      if (topic.id === 'di') shortName = 'Data Insights';
      categoryStats.push({ id: topic.id, name: shortName, total: catTotal, theoryCount: catTheory, practiceCount: catPractice, theoryPerc: catTotal ? Math.round((catTheory / catTotal) * 100) : 0, practicePerc: catTotal ? Math.round((catPractice / catTotal) * 100) : 0 });
    });
    return { total: totalSubtopics, theoryCount: theoryDoneCount, practiceCount: practiceDoneCount, fullyDoneCount: fullyDoneCount, theoryPerc: totalSubtopics ? Math.round((theoryDoneCount / totalSubtopics) * 100) : 0, practicePerc: totalSubtopics ? Math.round((practiceDoneCount / totalSubtopics) * 100) : 0, fullyDonePerc: totalSubtopics ? Math.round((fullyDoneCount / totalSubtopics) * 100) : 0, categoryStats, chartData: [{ name: 'Fully Done', value: fullyDoneCount, color: '#000000' }, { name: 'Partial', value: partialCount, color: '#9CA3AF' }, { name: 'Untouched', value: untouchedCount, color: '#F3F4F6' }] };
  }, [syllabus]);

  const mockAnalytics = useMemo(() => {
    if (mocks.length === 0) return null;
    const latest = mocks[mocks.length - 1].score, avg = Math.round(mocks.reduce((sum, m) => sum + m.score, 0) / mocks.length), last3 = mocks.slice(-3), movingAvg = Math.round(last3.reduce((sum, m) => sum + m.score, 0) / last3.length), safeTargetScore = parseInt(targetScore) || 0, gapLatest = safeTargetScore > 0 ? safeTargetScore - latest : null, gapAvg = safeTargetScore > 0 ? safeTargetScore - movingAvg : null;
    return { latest, avg, movingAvg, gapLatest, gapAvg };
  }, [mocks, targetScore]);

  const ProgressBar = ({ label, percentage, countText, size = 'md' }) => (
    <div className="mb-3 last:mb-0">
      <div className="flex justify-between items-center mb-1">
        <span className={size === 'sm' ? 'text-xs text-gray-500' : 'text-sm font-medium text-gray-700'}>{label}</span>
        <span className={size === 'sm' ? 'text-xs text-gray-400' : 'text-sm text-gray-500'}>
          {countText && <span className="mr-1.5">{countText} &bull;</span>} {percentage}%
        </span>
      </div>
      <div className={`w-full bg-gray-100 rounded-full ${size === 'sm' ? 'h-1.5' : 'h-2'}`}>
        <div className={`bg-black rounded-full transition-all duration-500 ${size === 'sm' ? 'h-1.5' : 'h-2'}`} style={{ width: `${percentage}%` }}></div>
      </div>
    </div>
  );

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-black" /></div>;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans selection:bg-gray-200">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xl font-bold tracking-tight">
            <div className="w-6 h-6 bg-black rounded-sm flex items-center justify-center"><div className="w-2 h-2 bg-white rounded-full"></div></div>
            GMAT Minimal
          </div>
          <div className="flex space-x-4 bg-gray-100 p-1 rounded-md">
            <button onClick={() => setActiveTab('topics')} className={`px-4 py-1.5 text-sm font-medium rounded ${activeTab === 'topics' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'}`}>Topics</button>
            <button onClick={() => setActiveTab('mocks')} className={`px-4 py-1.5 text-sm font-medium rounded ${activeTab === 'mocks' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'}`}>Mocks</button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {activeTab === 'topics' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-lg font-semibold mb-4">Syllabus Completion</h2>
              {syllabus.map(topic => (
                <div key={topic.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                  <button onClick={() => toggleAccordion(topic.id)} className="w-full px-5 py-4 flex justify-between items-center bg-white hover:bg-gray-50 transition-colors">
                    <span className="font-medium">{topic.name}</span>
                    {expandedTopics.includes(topic.id) ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </button>
                  {expandedTopics.includes(topic.id) && (
                    <div className="border-t border-gray-100">
                      <div className="grid grid-cols-12 px-5 py-2 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <div className="col-span-6">Subtopic</div><div className="col-span-3 text-center">Theory</div><div className="col-span-3 text-center">Practice</div>
                      </div>
                      {topic.subtopics.map(sub => (
                        <div key={sub.id} className="grid grid-cols-12 px-5 py-3 border-b border-gray-50 last:border-0 items-center hover:bg-gray-50/50">
                          <div className="col-span-6 text-sm text-gray-800 font-medium">{sub.name}</div>
                          <div className="col-span-3 flex justify-center"><button onClick={() => toggleSubtopic(topic.id, sub.id, 'theoryDone')}>{sub.theoryDone ? <CheckCircle2 className="w-5 h-5 text-black" /> : <Circle className="w-5 h-5 text-gray-300" />}</button></div>
                          <div className="col-span-3 flex justify-center"><button onClick={() => toggleSubtopic(topic.id, sub.id, 'practiceDone')}>{sub.practiceDone ? <CheckCircle2 className="w-5 h-5 text-black" /> : <Circle className="w-5 h-5 text-gray-300" />}</button></div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-6 lg:sticky lg:top-24">
              <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-5 flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Overview</h3>
                <ProgressBar label="Total Theory" percentage={syllabusAnalytics.theoryPerc} countText={`${syllabusAnalytics.theoryCount}/${syllabusAnalytics.total}`} />
                <div className="pl-3 mt-2 border-l-2 border-gray-100 space-y-1">
                  {syllabusAnalytics.categoryStats.map(cat => <ProgressBar key={`th-${cat.id}`} label={cat.name} percentage={cat.theoryPerc} countText={`${cat.theoryCount}/${cat.total}`} size="sm" />)}
                </div>
                <div className="mt-6">
                  <ProgressBar label="Total Practice" percentage={syllabusAnalytics.practicePerc} countText={`${syllabusAnalytics.practiceCount}/${syllabusAnalytics.total}`} />
                  <div className="pl-3 mt-2 border-l-2 border-gray-100 space-y-1">
                    {syllabusAnalytics.categoryStats.map(cat => <ProgressBar key={`pr-${cat.id}`} label={cat.name} percentage={cat.practicePerc} countText={`${cat.practiceCount}/${cat.total}`} size="sm" />)}
                  </div>
                </div>
                <div className="pt-4 mt-4 border-t border-gray-100"><ProgressBar label="Mastered" percentage={syllabusAnalytics.fullyDonePerc} countText={`${syllabusAnalytics.fullyDoneCount}/${syllabusAnalytics.total}`} /></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'mocks' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm relative"><div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Target</div><div className="flex items-baseline gap-2"><input type="number" value={targetScore} onChange={handleTargetScoreChange} onBlur={saveTargetScoreBlur} className="text-3xl font-bold bg-transparent border-b border-dashed border-gray-300 focus:border-black focus:outline-none w-24" /><Target className="w-5 h-5 text-gray-300 absolute right-4 top-4" /></div></div>
              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm"><div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Latest</div><div className="text-3xl font-bold">{mockAnalytics?.latest || '--'}</div></div>
              <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm"><div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Avg L3</div><div className="text-3xl font-bold text-gray-700">{mockAnalytics?.movingAvg || '--'}</div></div>
              <div className={`border rounded-lg p-5 shadow-sm ${mockAnalytics?.gapLatest <= 0 ? 'bg-black text-white' : 'bg-white'}`}><div className="text-xs font-bold uppercase tracking-wider mb-1">Gap (Latest)</div><div className="text-3xl font-bold">{!mockAnalytics ? '--' : mockAnalytics.gapLatest <= 0 ? 'Reached!' : `${mockAnalytics.gapLatest}`}</div></div>
              <div className={`border rounded-lg p-5 shadow-sm ${mockAnalytics?.gapAvg <= 0 ? 'bg-black text-white' : 'bg-white'}`}><div className="text-xs font-bold uppercase tracking-wider mb-1">Gap (Avg)</div><div className="text-3xl font-bold">{!mockAnalytics ? '--' : mockAnalytics.gapAvg <= 0 ? 'Reached!' : `${mockAnalytics.gapAvg}`}</div></div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm"><h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-6">Trajectory</h3>{mocks.length > 0 ? (<div className="h-72 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={mocks} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" /><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} /><YAxis domain={['dataMin - 20', 'dataMax + 20']} axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} /><RechartsTooltip contentStyle={{ backgroundColor: '#111827', color: '#fff', borderRadius: '8px', border: 'none' }} /><ReferenceLine y={targetScore} stroke="#d1d5db" strokeDasharray="3 3" /><Line type="monotone" dataKey="score" stroke="#000000" strokeWidth={3} dot={{ r: 4, fill: '#000' }} activeDot={{ r: 6, fill: '#000', stroke: '#fff', strokeWidth: 2 }} /></LineChart></ResponsiveContainer></div>) : (<div className="h-72 w-full flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-lg">Log your first mock to see trend.</div>)}</div>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              <div className="p-5 border-b border-gray-100 bg-gray-50/50"><form onSubmit={handleAddMock} className="flex flex-col sm:flex-row gap-3"><input type="text" placeholder="Name" value={mockForm.name} onChange={e => setMockForm({...mockForm, name: e.target.value})} className="flex-1 px-4 py-2 border rounded-md text-sm" /><input type="date" required value={mockForm.date} onChange={e => setMockForm({...mockForm, date: e.target.value})} className="px-4 py-2 border rounded-md text-sm" /><input type="number" placeholder="Score" required min="200" max="805" value={mockForm.score} onChange={e => setMockForm({...mockForm, score: e.target.value})} className="w-full sm:w-28 px-4 py-2 border rounded-md text-sm" /><button type="submit" className="bg-black text-white px-5 py-2 rounded-md font-medium text-sm">Add Mock</button></form></div>
              <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr className="bg-white border-b border-gray-100 text-gray-500"><th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Date</th><th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs">Name</th><th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs text-right">Score</th><th className="px-6 py-4 font-semibold uppercase tracking-wider text-xs text-center w-20">Del</th></tr></thead><tbody className="divide-y divide-gray-50">{mocks.length === 0 ? (<tr><td colSpan="4" className="px-6 py-8 text-center text-gray-400">No mocks logged.</td></tr>) : ([...mocks].reverse().map(mock => (<tr key={mock.id} className="hover:bg-gray-50/50"><td className="px-6 py-4 text-gray-600">{new Date(mock.date).toLocaleDateString()}</td><td className="px-6 py-4 font-medium text-gray-900">{mock.name}</td><td className="px-6 py-4 text-right font-bold text-lg">{mock.score}</td><td className="px-6 py-4 text-center"><button onClick={() => handleDeleteMock(mock.id)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4 mx-auto" /></button></td></tr>)))}</tbody></table></div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}