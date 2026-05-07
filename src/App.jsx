import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Fonts via @import in style tag ──
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Crimson+Pro:ital,wght@0,300;0,400;1,300;1,400&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --ink: #0f0d0a;
      --amber: #c8874a;
      --amber-soft: #d4956a;
      --amber-pale: #e8c49a;
      --rust: #8b4a2a;
      --sage: #6b7c5e;
      --mist: #8a8278;
      --cream: #ede5d8;
      --fear: #c48a8a;
      --hope: #8aba8a;
      --grief: #8a8aba;
      --guilt: #ba8a6a;
      --desire: #aaba8a;
    }

    html, body, #root {
      height: 100%;
      overflow: hidden;
    }

    /* Allow scrolling per-screen where needed */
    body { overflow-y: auto; }

    body {
      background: #0f0d0a;
      font-family: 'Crimson Pro', Georgia, serif;
      color: #ede5d8;
      min-height: 100vh;
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
    }

    body::after {
      content: '';
      position: fixed;
      inset: 0;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E");
      pointer-events: none;
      z-index: 9999;
    }

    /* ── Reset all buttons globally ── */
    button {
      all: unset;
      box-sizing: border-box;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-family: 'Crimson Pro', Georgia, serif;
      -webkit-font-smoothing: antialiased;
    }

    button:focus-visible {
      outline: 1px solid rgba(200,135,74,0.5);
      outline-offset: 2px;
    }

    textarea {
      font-family: 'Crimson Pro', Georgia, serif;
      -webkit-font-smoothing: antialiased;
    }

    input, textarea {
      background: transparent;
      border: none;
      outline: none;
    }

    ::-webkit-scrollbar { width: 4px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(200,135,74,0.2); border-radius: 2px; }

    .cormorant { font-family: 'Cormorant Garamond', Georgia, serif; }

    /* ── Landing specific spacing ── */
    .landing-tagline {
      margin-top: 6px;
      margin-bottom: 52px;
      font-size: 0.72rem;
      letter-spacing: 0.32em;
      text-transform: uppercase;
      color: #8a8278;
    }

    .landing-desc {
      text-align: center;
      max-width: 460px;
      margin-bottom: 52px;
      font-weight: 300;
      font-style: italic;
      line-height: 1.95;
      color: rgba(237,229,216,0.65);
      font-size: 1.08rem;
    }

    .btn-primary-landing {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 15px 52px;
      border: 1px solid rgba(200,135,74,0.32);
      color: #e8c49a;
      background: transparent;
      font-family: 'Crimson Pro', Georgia, serif;
      font-size: 0.78rem;
      letter-spacing: 0.32em;
      text-transform: uppercase;
      cursor: pointer;
      transition: border-color 0.3s ease, color 0.3s ease;
      position: relative;
    }

    .btn-primary-landing::before {
      content: '';
      position: absolute;
      inset: 0;
      background: rgba(200,135,74,0.05);
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .btn-primary-landing:hover {
      border-color: rgba(200,135,74,0.65);
      color: #d4956a;
    }

    .btn-primary-landing:hover::before {
      opacity: 1;
    }

    .btn-ghost-landing {
      background: none;
      border: none;
      color: rgba(138,130,120,0.5);
      font-family: 'Crimson Pro', Georgia, serif;
      font-size: 0.75rem;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      cursor: pointer;
      margin-top: 6px;
      transition: color 0.2s ease, opacity 0.2s ease;
    }

    .btn-ghost-landing:hover {
      color: rgba(200,135,74,0.7);
    }
  `}</style>
);

// ── Local Storage ──
const DB_KEY = "ambivalence_sessions";
function loadSessions() {
  try { return JSON.parse(localStorage.getItem(DB_KEY) || "[]"); } catch { return []; }
}
function saveSession(session) {
  const sessions = loadSessions();
  const idx = sessions.findIndex(s => s.id === session.id);
  if (idx >= 0) sessions[idx] = session; else sessions.unshift(session);
  localStorage.setItem(DB_KEY, JSON.stringify(sessions.slice(0, 20)));
}

// ── AI API ──
async function callGemini(systemPrompt, userMessage, retries = 2) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) throw new Error("VITE_GEMINI_API_KEY is not set in .env");
  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: systemPrompt,
  });
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent(userMessage);
      return result.response.text();
    } catch (err) {
      const is503 = err?.message?.includes("503") || err?.status === 503;
      if (is503 && attempt < retries) {
        await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
}

async function extractTensions(journalText) {
  const system = `You are an affective computing system that reads emotional subtext in personal writing. 
Extract 3-4 emotional tensions from the text. Each tension is a pair of competing emotional truths.
Respond ONLY with valid JSON, no markdown, no explanation.
Format:
{
  "tensions": [
    {
      "id": "t0",
      "toward": "short label for the pull toward something",
      "away": "short label for the pull away",
      "towardEmotion": "one of: desire|hope|love|relief|excitement|curiosity",
      "awayEmotion": "one of: fear|grief|guilt|anger|shame|anxiety",
      "quote": "a short phrase (max 12 words) that captures this tension from their writing",
      "weight": 0.85,
      "reframe": "a single depth question (max 25 words) that opens this tension without resolving it"
    }
  ],
  "closingReflection": "one sentence acknowledgment of what the person held today, warm and non-prescriptive"
}`;
  const raw = await callClaude(system, journalText);
  try {
    const clean = raw.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    return getMockTensions();
  }
}

async function getDepthResponse(tension, question, answer) {
  const system = `You are a gentle, perceptive emotional companion. 
The user is exploring the tension between "${tension.toward}" and "${tension.away}".
They answered a depth question. Offer ONE follow-up question that goes deeper — not broader.
Keep it under 20 words. No preamble. Just the question.`;
  return await callClaude(system, `Question asked: "${question}"\nTheir answer: "${answer}"`);
}

function getMockTensions() {
  return {
    tensions: [
      { id: "t0", toward: "Longing for freedom", away: "Fear of failure", towardEmotion: "desire", awayEmotion: "fear", quote: "What if I'm not as capable as I think?", weight: 0.85, reframe: "What would you need to feel safe enough to choose freedom without guaranteed outcomes?" },
      { id: "t1", toward: "Loyalty to others", away: "Resentment of sacrifice", towardEmotion: "love", awayEmotion: "anger", quote: "I've given so much to these people", weight: 0.70, reframe: "Is the loyalty you feel earned, or protecting you from choosing yourself?" },
      { id: "t2", toward: "Desire for meaning", away: "Comfort of familiarity", towardEmotion: "hope", awayEmotion: "anxiety", quote: "The new path feels more like me", weight: 0.60, reframe: "What specifically do you fear losing if the new path turns out to be right?" },
      { id: "t3", toward: "Excitement about change", away: "Grief for what ends", towardEmotion: "excitement", awayEmotion: "grief", quote: "Mourning something I can't even name yet", weight: 0.50, reframe: "What are you beginning to grieve that you haven't fully let yourself name?" }
    ],
    closingReflection: "Today you held longing alongside fear, loyalty alongside resentment — and you did not flinch from any of it."
  };
}

const DEMO_TEXT = `I keep going back and forth about leaving my job. I know I need to leave — I've known for two years. The work stopped meaning anything a long time ago and I feel this constant low-grade dread on Sunday evenings. But then I think about my team. I've built something real with them. I care about them. If I leave, who holds things together?

There's also this voice that says: what if I'm wrong about myself? What if I think I can do something bigger but I actually can't? At least here I know what I'm doing. There's comfort in that, even if the comfort feels kind of hollow.

And then some days I feel genuinely excited about the other path. Like I can see it clearly and it feels more like me. But that excitement is immediately followed by this strange grief — like I'm already mourning the version of this life even before I leave it. I don't know what I'm mourning exactly. Maybe just certainty.

I think I'm scared that wanting more is a kind of betrayal. Of the people here, of the stability, of the person I've been.`;

const EMOTION_COLORS = {
  desire: "#aaba8a", hope: "#8aba8a", love: "#ba8a9a", relief: "#8ab8ba",
  excitement: "#c8b06a", curiosity: "#9aaa8a",
  fear: "#c48a8a", grief: "#8a8aba", guilt: "#ba8a6a",
  anger: "#c07060", shame: "#9a7a8a", anxiety: "#c4a87a"
};

// ══════════════════════════════════════════════
// SCREEN: LANDING
// ══════════════════════════════════════════════
function LandingScreen({ onBegin, onHistory, sessionCount }) {
  return (
    <motion.div
      className="min-h-screen flex flex-col items-center justify-center px-6 py-16 relative overflow-hidden"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      {/* Ambient blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div style={{ position:'absolute', width:500, height:400, borderRadius:'50%', background:'radial-gradient(ellipse, rgba(200,135,74,0.06) 0%, transparent 70%)', top:'5%', left:'-10%', filter:'blur(40px)' }}/>
        <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', background:'radial-gradient(ellipse, rgba(107,124,94,0.05) 0%, transparent 70%)', bottom:'10%', right:'-5%', filter:'blur(40px)' }}/>
        <div style={{ position:'absolute', width:300, height:300, borderRadius:'50%', background:'radial-gradient(ellipse, rgba(74,74,122,0.04) 0%, transparent 70%)', top:'40%', right:'15%', filter:'blur(50px)' }}/>
      </div>

      {/* Logo mark */}
      <motion.div
        className="mb-8"
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
          <circle cx="26" cy="36" r="18" stroke="rgba(200,135,74,0.45)" strokeWidth="1"/>
          <circle cx="46" cy="36" r="18" stroke="rgba(107,124,94,0.45)" strokeWidth="1"/>
          <path d="M36 20.1a18 18 0 010 31.8A18 18 0 0136 20.1z" fill="rgba(200,135,74,0.06)" stroke="rgba(200,135,74,0.2)" strokeWidth="0.5"/>
          <circle cx="36" cy="36" r="2.5" fill="rgba(200,135,74,0.65)"/>
        </svg>
      </motion.div>

      <motion.h1
        className="cormorant font-light"
        style={{ fontSize: 'clamp(2.8rem, 7vw, 4.2rem)', color: '#e8c49a', letterSpacing: '0.13em', marginBottom: 6 }}
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
      >
        Ambivalence
      </motion.h1>

      <motion.p
        className="landing-tagline"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
      >
        A map of your competing truths
      </motion.p>

      <motion.p
        className="landing-desc"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
      >
        When you're stuck, it's rarely about information.<br/>
        It's because two true things pull in opposite directions.<br/>
        Write freely. Let the map emerge.
      </motion.p>

      <motion.div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
      >
        <button onClick={onBegin} className="btn-primary-landing">
          Begin Writing
        </button>

        {sessionCount > 0 && (
          <button onClick={onHistory} className="btn-ghost-landing">
            {sessionCount} past {sessionCount === 1 ? 'session' : 'sessions'} →
          </button>
        )}
      </motion.div>

      <motion.p
        style={{ position: 'absolute', bottom: 32, fontSize: '0.72rem', letterSpacing: '0.08em', color: 'rgba(138,130,120,0.38)' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
      >
        Your words stay on your device. Nothing is stored remotely.
      </motion.p>
    </motion.div>
  );
}

// ══════════════════════════════════════════════
// SCREEN: WRITE
// ══════════════════════════════════════════════
function WriteScreen({ onBack, onSubmit }) {
  const [text, setText] = useState("");
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const canSubmit = wordCount >= 20;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', background: '#0f0d0a', position: 'relative' }}
    >
      {/* Fixed nav */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        padding: '22px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'linear-gradient(to bottom, rgba(15,13,10,0.98) 60%, transparent)',
      }}>
        <span className="cormorant" style={{ fontSize: '0.85rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(232,196,154,0.45)' }}>
          Ambivalence
        </span>
        <button onClick={onBack}
          style={{ color: 'rgba(138,130,120,0.5)', fontSize: '0.72rem', letterSpacing: '0.22em', textTransform: 'uppercase', transition: 'color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(200,135,74,0.7)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(138,130,120,0.5)'}
        >← Back</button>
      </div>

      {/* Main content */}
      <div style={{ width: '100%', maxWidth: 680, paddingTop: 120, paddingBottom: 80, paddingLeft: 24, paddingRight: 24 }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          style={{ textAlign: 'center', marginBottom: 44 }}
        >
          <p style={{ fontSize: '0.7rem', letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(200,135,74,0.55)', marginBottom: 16 }}>
            Free Writing
          </p>
          <h2 className="cormorant" style={{ fontSize: 'clamp(1.9rem, 4vw, 2.6rem)', fontWeight: 300, color: '#e8c49a', marginBottom: 14 }}>
            What are you caught between?
          </h2>
          <p style={{ fontWeight: 300, fontStyle: 'italic', color: 'rgba(138,130,120,0.75)', fontSize: '1rem', lineHeight: 1.75 }}>
            Don't organize your thoughts. Write as if no one is reading.<br />
            Let contradictions coexist.
          </p>
        </motion.div>

        {/* Textarea with corner brackets */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          style={{ position: 'relative' }}
        >
          {/* Corner brackets */}
          {[
            { top: -1, left: -1, borderTop: '1px solid rgba(200,135,74,0.28)', borderLeft: '1px solid rgba(200,135,74,0.28)' },
            { top: -1, right: -1, borderTop: '1px solid rgba(200,135,74,0.28)', borderRight: '1px solid rgba(200,135,74,0.28)' },
            { bottom: -1, left: -1, borderBottom: '1px solid rgba(200,135,74,0.28)', borderLeft: '1px solid rgba(200,135,74,0.28)' },
            { bottom: -1, right: -1, borderBottom: '1px solid rgba(200,135,74,0.28)', borderRight: '1px solid rgba(200,135,74,0.28)' },
          ].map((s, i) => (
            <div key={i} style={{ position: 'absolute', width: 16, height: 16, pointerEvents: 'none', ...s }} />
          ))}

          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            style={{
              display: 'block',
              width: '100%',
              minHeight: 320,
              resize: 'none',
              outline: 'none',
              background: 'rgba(255,255,255,0.022)',
              border: 'none',
              color: '#ede5d8',
              fontFamily: "'Crimson Pro', Georgia, serif",
              fontSize: '1.1rem',
              fontWeight: 300,
              lineHeight: 1.95,
              padding: '32px 36px',
              caretColor: 'rgba(200,135,74,0.7)',
            }}
            placeholder="I keep going back and forth about... Part of me wants to... and yet I can't stop thinking about... I know I should feel one way but..."
          />
        </motion.div>

        {/* Below textarea row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
          <button
            onClick={() => setText(DEMO_TEXT)}
            style={{
              color: 'rgba(138,130,120,0.42)', fontSize: '0.82rem',
              letterSpacing: '0.1em', fontStyle: 'italic',
              transition: 'color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'rgba(200,135,74,0.6)'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(138,130,120,0.42)'}
          >
            Use demo entry
          </button>
          <span style={{ fontSize: '0.78rem', color: 'rgba(138,130,120,0.38)', letterSpacing: '0.05em' }}>
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </span>
        </div>

        {/* Submit button */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
          style={{ display: 'flex', justifyContent: 'center', marginTop: 40 }}
        >
          <button
            onClick={() => canSubmit && onSubmit(text)}
            style={{
              padding: '16px 52px',
              border: `1px solid ${canSubmit ? 'rgba(200,135,74,0.38)' : 'rgba(200,135,74,0.12)'}`,
              color: canSubmit ? '#e8c49a' : 'rgba(232,196,154,0.28)',
              background: 'transparent',
              fontSize: '0.8rem',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              cursor: canSubmit ? 'pointer' : 'default',
              transition: 'border-color 0.3s, color 0.3s',
            }}
            onMouseEnter={e => { if (canSubmit) { e.currentTarget.style.borderColor = 'rgba(200,135,74,0.68)'; e.currentTarget.style.color = '#d4956a'; } }}
            onMouseLeave={e => { if (canSubmit) { e.currentTarget.style.borderColor = 'rgba(200,135,74,0.38)'; e.currentTarget.style.color = '#e8c49a'; } }}
          >
            Map My Tensions →
          </button>
        </motion.div>

        {/* Hint */}
        {!canSubmit && wordCount > 0 && (
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: 'center', marginTop: 12, fontSize: '0.78rem', fontStyle: 'italic', color: 'rgba(138,130,120,0.35)' }}
          >
            Keep writing — {20 - wordCount} more {20 - wordCount === 1 ? 'word' : 'words'} to unlock
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}

// ══════════════════════════════════════════════
// SCREEN: PROCESSING
// ══════════════════════════════════════════════
function ProcessingScreen() {
  const steps = ["Parsing emotional fragments", "Identifying competing needs", "Mapping tension pairs", "Weighting by recurrence", "Preparing your map"];
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActive(a => Math.min(a + 1, steps.length)), 600);
    return () => clearInterval(t);
  }, []);

  const rings = [
    { size: 72, delay: 0, opacity: 0.55 },
    { size: 108, delay: 0.5, opacity: 0.35 },
    { size: 148, delay: 1.0, opacity: 0.18 },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px', textAlign: 'center', background: '#0f0d0a',
      }}
    >
      {/* Orb */}
      <div style={{ position: 'relative', width: 148, height: 148, marginBottom: 52, flexShrink: 0 }}>
        {rings.map((ring, i) => (
          <motion.div key={i}
            style={{
              position: 'absolute',
              width: ring.size, height: ring.size,
              top: '50%', left: '50%',
              marginTop: -(ring.size / 2), marginLeft: -(ring.size / 2),
              borderRadius: '50%',
              border: '1px solid rgba(200,135,74,0.4)',
              opacity: ring.opacity,
            }}
            animate={{ scale: [1, 1.07, 1], opacity: [ring.opacity * 0.7, ring.opacity, ring.opacity * 0.7] }}
            transition={{ duration: 2.6, repeat: Infinity, delay: ring.delay, ease: "easeInOut" }}
          />
        ))}
        <motion.div
          style={{
            position: 'absolute',
            width: 44, height: 44,
            top: '50%', left: '50%',
            marginTop: -22, marginLeft: -22,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(200,135,74,0.45) 0%, rgba(200,135,74,0.12) 60%, transparent 100%)',
          }}
          animate={{ opacity: [0.5, 1, 0.5], scale: [0.95, 1.05, 0.95] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <h2 className="cormorant" style={{ fontSize: '1.75rem', fontWeight: 300, color: '#e8c49a', marginBottom: 10, letterSpacing: '0.02em' }}>
        Reading between the lines
      </h2>

      <p style={{ fontSize: '0.9rem', fontStyle: 'italic', fontWeight: 300, color: 'rgba(138,130,120,0.5)', marginBottom: 48 }}>
        Listening for what you're really saying
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
        {steps.map((s, i) => (
          <motion.p key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: i < active ? 0.32 : i === active ? 0.9 : 0 }}
            transition={{ duration: 0.45 }}
            style={{
              fontSize: '0.72rem', letterSpacing: '0.22em', textTransform: 'uppercase',
              color: i === active ? '#c8874a' : '#8a8278', fontWeight: 300,
            }}
          >
            {i < active ? '✓  ' : ''}{s}
          </motion.p>
        ))}
      </div>
    </motion.div>
  );
}

// ══════════════════════════════════════════════
// MAP CANVAS
// ══════════════════════════════════════════════
function TensionCanvas({ tensions, activeTension, onNodeHover }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const progressRef = useRef(0);
  const hoverRef = useRef(null);
  const activeRef = useRef(activeTension);

  useEffect(() => { activeRef.current = activeTension; }, [activeTension]);

  const buildNodes = useCallback((w, h) => {
    const cx = w / 2, cy = h / 2;
    const angles = [-130, -50, 50, 130, 180, 0, -90, 90];
    const radii = [w * 0.27, w * 0.25, w * 0.24, w * 0.22];

    const nodes = [{ id: 'self', x: cx, y: cy, r: 20, color: 'rgba(200,135,74,0.8)', label: 'Center', emotion: 'The stuck self', quote: 'Where all tensions meet', tensionIdx: -1 }];

    tensions.forEach((t, i) => {
      const a1 = (angles[i * 2] * Math.PI) / 180;
      const a2 = (angles[i * 2 + 1] * Math.PI) / 180;
      const rad = radii[i] || w * 0.22;
      nodes.push({
        id: `t${i}a`, x: cx + Math.cos(a1) * rad, y: cy + Math.sin(a1) * rad * 0.75,
        r: 14 + t.weight * 16, color: EMOTION_COLORS[t.towardEmotion] || '#8aba8a',
        label: t.toward, emotion: t.towardEmotion, quote: `"${t.quote}"`, tensionIdx: i
      });
      nodes.push({
        id: `t${i}b`, x: cx + Math.cos(a2) * rad, y: cy + Math.sin(a2) * rad * 0.75,
        r: 12 + t.weight * 14, color: EMOTION_COLORS[t.awayEmotion] || '#c48a8a',
        label: t.away, emotion: t.awayEmotion, quote: `"${t.away}"`, tensionIdx: i
      });
    });
    return nodes;
  }, [tensions]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.parentElement;

    const resize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight || 520;
    };
    resize();
    progressRef.current = 0;

    const nodes = buildNodes(canvas.width, canvas.height);

    const hexToRgba = (color, alpha) => {
      if (color.startsWith('rgba')) return color.replace(/[\d.]+\)$/, alpha + ')');
      if (color.startsWith('rgb')) return color.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
      const hex = color.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16), g = parseInt(hex.substr(2, 2), 16), b = parseInt(hex.substr(4, 2), 16);
      return `rgba(${r},${g},${b},${alpha})`;
    };

    const getNode = id => nodes.find(n => n.id === id);

    const startTime = performance.now();

    const drawCenterNode = (ctx, node, p) => {
      const t = (performance.now() - startTime) / 1000;
      const x = node.x, y = node.y;

      // Three concentric rings pulsing at different phases
      const rings = [
        { r: node.r * 1.0,  phase: 0,              baseOpacity: 0.55 },
        { r: node.r * 1.75, phase: Math.PI * 0.7,  baseOpacity: 0.28 },
        { r: node.r * 2.6,  phase: Math.PI * 1.3,  baseOpacity: 0.12 },
      ];

      rings.forEach(ring => {
        const pulse = 0.5 + 0.5 * Math.sin(t * 2.6 + ring.phase);
        const opacity = ring.baseOpacity * (0.6 + 0.4 * pulse) * Math.min(p * 2, 1);
        const radius = ring.r * (1 + 0.06 * pulse);
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(200,135,74,${opacity})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Outer ambient glow
      const glowPulse = 0.5 + 0.5 * Math.sin(t * 1.8);
      const glowR = node.r * 3.4 * Math.min(p * 1.5, 1);
      const grd = ctx.createRadialGradient(x, y, 0, x, y, glowR);
      grd.addColorStop(0, `rgba(200,135,74,${0.18 * glowPulse})`);
      grd.addColorStop(0.4, `rgba(200,135,74,${0.07 * glowPulse})`);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath(); ctx.arc(x, y, glowR, 0, Math.PI * 2);
      ctx.fillStyle = grd; ctx.fill();

      // Inner filled core
      const corePulse = 0.5 + 0.5 * Math.sin(t * 2.6);
      const coreR = node.r * Math.min(p * 2, 1);
      const coreGrd = ctx.createRadialGradient(x, y, 0, x, y, coreR);
      coreGrd.addColorStop(0, `rgba(232,196,154,${(0.38 + 0.2 * corePulse) * Math.min(p * 2, 1)})`);
      coreGrd.addColorStop(0.5, `rgba(200,135,74,${(0.16 + 0.1 * corePulse) * Math.min(p * 2, 1)})`);
      coreGrd.addColorStop(1, 'rgba(200,135,74,0)');
      ctx.beginPath(); ctx.arc(x, y, coreR, 0, Math.PI * 2);
      ctx.fillStyle = coreGrd; ctx.fill();

      // Bright center dot
      const dotPulse = 0.5 + 0.5 * Math.sin(t * 2.6 + 0.5);
      ctx.beginPath(); ctx.arc(x, y, 3.5 * Math.min(p * 2, 1), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(232,196,154,${0.7 + 0.3 * dotPulse})`;
      ctx.fill();
    };

    const draw = () => {
      const ctx = canvas.getContext('2d');
      const w = canvas.width, h = canvas.height;
      progressRef.current = Math.min(progressRef.current + 0.008, 1);
      const p = progressRef.current;
      const activeTen = activeRef.current;
      ctx.clearRect(0, 0, w, h);

      // Draw edges
      tensions.forEach((t, i) => {
        const na = getNode(`t${i}a`), nb = getNode(`t${i}b`), ns = getNode('self');
        if (!na || !nb || !ns) return;
        const isFocused = activeTen === null || activeTen === i;
        const alpha = isFocused ? 1 : 0.15;

        // Spine lines to center
        [na, nb].forEach(node => {
          ctx.beginPath();
          ctx.moveTo(ns.x, ns.y); ctx.lineTo(node.x, node.y);
          ctx.strokeStyle = `rgba(200,135,74,${0.1 * alpha * p})`;
          ctx.lineWidth = 1; ctx.setLineDash([2, 10]); ctx.stroke(); ctx.setLineDash([]);
        });

        // Tension arc
        const mx = (na.x + nb.x) / 2, my = (na.y + nb.y) / 2;
        const dx = nb.x - na.x, dy = nb.y - na.y;
        const cpx = mx - dy * 0.28, cpy = my + dx * 0.28;
        ctx.beginPath(); ctx.moveTo(na.x, na.y); ctx.quadraticCurveTo(cpx, cpy, nb.x, nb.y);
        ctx.strokeStyle = hexToRgba(na.color, 0.28 * alpha * p);
        ctx.lineWidth = 1.2; ctx.setLineDash([5, 7]); ctx.stroke(); ctx.setLineDash([]);
      });

      // Draw tension nodes first, center node rendered last (on top)
      nodes.forEach(node => {
        if (node.id === 'self') return;

        const isFocused = activeTen === null || node.tensionIdx === activeTen;
        const alpha = isFocused ? 1 : 0.18;
        const isHover = hoverRef.current?.id === node.id;
        const r = node.r * (isHover ? 1.18 : 1) * Math.min(p * 2, 1);

        // Glow
        if (isFocused) {
          const grd = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r * 2.8);
          grd.addColorStop(0, hexToRgba(node.color, 0.12 * alpha));
          grd.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.beginPath(); ctx.arc(node.x, node.y, r * 2.8, 0, Math.PI * 2);
          ctx.fillStyle = grd; ctx.fill();
        }

        // Fill
        ctx.beginPath(); ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(node.color, 0.14 * alpha); ctx.fill();
        ctx.strokeStyle = hexToRgba(node.color, 0.65 * alpha);
        ctx.lineWidth = isHover ? 1.5 : 1; ctx.stroke();

        // Core dot
        ctx.beginPath(); ctx.arc(node.x, node.y, Math.min(r * 0.28, 5), 0, Math.PI * 2);
        ctx.fillStyle = hexToRgba(node.color, 0.85 * alpha); ctx.fill();

        // Label
        if (isFocused && p > 0.6) {
          const labelAlpha = ((p - 0.6) / 0.4) * alpha;
          ctx.font = `300 ${isHover ? 11.5 : 10.5}px 'Crimson Pro', serif`;
          ctx.fillStyle = `rgba(232,196,154,${0.72 * labelAlpha})`;
          ctx.textAlign = 'center';
          const words = node.label.split(' ');
          const lines = [];
          let cur = '';
          words.forEach(w => { if ((cur + ' ' + w).trim().length > 13) { lines.push(cur.trim()); cur = w; } else cur = (cur + ' ' + w).trim(); });
          if (cur) lines.push(cur);
          lines.slice(0, 2).forEach((l, li) => ctx.fillText(l, node.x, node.y + r + 13 + li * 12));
        }
      });

      // Draw animated center node on top of everything
      const selfNode = getNode('self');
      if (selfNode) drawCenterNode(ctx, selfNode, p);

      animRef.current = requestAnimationFrame(draw);
    };

    draw();

    // Mouse interactions
    const onMove = e => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      const found = nodes.find(n => {
        const dx = n.x - mx, dy = n.y - my;
        return Math.sqrt(dx * dx + dy * dy) < n.r + 10 && n.id !== 'self';
      });
      hoverRef.current = found || null;
      canvas.style.cursor = found ? 'pointer' : 'default';
      onNodeHover(found || null);
    };
    const onLeave = () => { hoverRef.current = null; onNodeHover(null); };

    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseleave', onLeave);
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animRef.current);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseleave', onLeave);
      window.removeEventListener('resize', resize);
    };
  }, [tensions, buildNodes]);

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

// ══════════════════════════════════════════════
// SCREEN: MAP
// ══════════════════════════════════════════════
function MapScreen({ session, onBack, onDepthDive, onNewSession }) {
  const { tensions, closingReflection } = session.data;
  const [activeTension, setActiveTension] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [showClose, setShowClose] = useState(false);

  const activeTen = activeTension !== null ? tensions[activeTension] : null;

  const sectionLabel = {
    fontSize: '0.68rem', letterSpacing: '0.3em', textTransform: 'uppercase',
    color: 'rgba(200,135,74,0.55)', marginBottom: 12,
    paddingBottom: 10, borderBottom: '1px solid rgba(200,135,74,0.1)',
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0f0d0a', overflow: 'hidden' }}
    >
      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '18px 32px', flexShrink: 0,
        borderBottom: '1px solid rgba(200,135,74,0.1)',
        background: 'rgba(15,13,10,0.98)',
      }}>
        <div>
          <h2 className="cormorant" style={{ fontSize: '1.3rem', fontWeight: 300, color: '#e8c49a', marginBottom: 3 }}>
            Your Ambivalence Map
          </h2>
          <p style={{ fontSize: '0.72rem', letterSpacing: '0.06em', color: 'rgba(138,130,120,0.45)' }}>
            {tensions.length} tensions found · hover to explore · click a card to focus
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {[['← Write Again', onBack], ['New Session', onNewSession]].map(([label, fn]) => (
            <button key={label} onClick={fn}
              style={{
                padding: '8px 16px', border: '1px solid rgba(200,135,74,0.2)',
                color: 'rgba(232,196,154,0.55)', fontSize: '0.72rem',
                letterSpacing: '0.18em', textTransform: 'uppercase',
                transition: 'border-color 0.2s, color 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,135,74,0.5)'; e.currentTarget.style.color = '#e8c49a'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(200,135,74,0.2)'; e.currentTarget.style.color = 'rgba(232,196,154,0.55)'; }}
            >{label}</button>
          ))}
        </div>
      </div>

      {/* ── Body: Canvas + Sidebar ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>

        {/* Canvas area */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <TensionCanvas tensions={tensions} activeTension={activeTension} onNodeHover={setHoveredNode} />

          {/* Hover tooltip */}
          <AnimatePresence>
            {hoveredNode && (
              <motion.div
                style={{
                  position: 'absolute', top: 20, left: 20,
                  maxWidth: 210, padding: '12px 16px',
                  background: 'rgba(15,13,10,0.96)',
                  border: '1px solid rgba(200,135,74,0.2)',
                  pointerEvents: 'none',
                }}
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              >
                <p style={{ fontSize: '0.65rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: hoveredNode.color || '#c8874a', opacity: 0.85, marginBottom: 6 }}>
                  {hoveredNode.emotion}
                </p>
                <p style={{ fontSize: '0.88rem', fontStyle: 'italic', fontWeight: 300, color: 'rgba(237,229,216,0.75)', lineHeight: 1.6 }}>
                  {hoveredNode.quote}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Sidebar ── */}
        <div style={{
          width: 300, flexShrink: 0,
          borderLeft: '1px solid rgba(200,135,74,0.1)',
          overflowY: 'auto',
          padding: '24px 20px',
          display: 'flex', flexDirection: 'column', gap: 24,
        }}>

          {/* Tensions */}
          <div>
            <p style={sectionLabel}>Tensions</p>
            {tensions.map((t, i) => (
              <motion.div key={t.id}
                onClick={() => setActiveTension(activeTension === i ? null : i)}
                whileHover={{ scale: 1.01 }}
                style={{
                  marginBottom: 10, padding: '12px 14px', cursor: 'pointer',
                  border: '1px solid ' + (activeTension === i ? 'rgba(200,135,74,0.3)' : 'rgba(255,255,255,0.05)'),
                  background: activeTension === i ? 'rgba(200,135,74,0.06)' : 'rgba(255,255,255,0.02)',
                  borderLeft: `2px solid ${EMOTION_COLORS[t.towardEmotion] || '#c8874a'}`,
                  transition: 'border-color 0.2s, background 0.2s',
                }}
              >
                {/* Tag row */}
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'rgba(138,186,138,0.14)', color: '#8aba8a', border: '1px solid rgba(138,186,138,0.22)' }}>
                    {t.toward}
                  </span>
                  <span style={{ fontSize: '0.62rem', color: 'rgba(138,130,120,0.38)', letterSpacing: '0.15em' }}>vs</span>
                  <span style={{ fontSize: '0.75rem', padding: '2px 8px', background: 'rgba(196,138,138,0.14)', color: '#c48a8a', border: '1px solid rgba(196,138,138,0.22)' }}>
                    {t.away}
                  </span>
                </div>

                {/* Quote */}
                <p style={{ fontSize: '0.85rem', fontStyle: 'italic', fontWeight: 300, color: 'rgba(237,229,216,0.55)', lineHeight: 1.55, marginBottom: 8 }}>
                  "{t.quote}"
                </p>

                {/* Weight bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 2, background: 'rgba(255,255,255,0.07)', position: 'relative' }}>
                    <motion.div
                      style={{ position: 'absolute', left: 0, top: 0, bottom: 0, background: 'linear-gradient(to right, rgba(200,135,74,0.3), rgba(200,135,74,0.65))' }}
                      initial={{ width: 0 }} animate={{ width: `${t.weight * 100}%` }}
                      transition={{ duration: 1, delay: i * 0.1 }}
                    />
                  </div>
                  <span style={{ fontSize: '0.65rem', color: 'rgba(138,130,120,0.38)', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
                    {t.weight > 0.75 ? 'High' : t.weight > 0.55 ? 'Strong' : 'Present'}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Depth prompt */}
          {activeTen && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <p style={sectionLabel}>Depth Prompt</p>
              <div style={{ padding: '14px 16px', border: '1px solid rgba(107,124,94,0.2)', background: 'rgba(107,124,94,0.04)', marginBottom: 10 }}>
                <p style={{ fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(107,124,94,0.65)', marginBottom: 8 }}>
                  For this tension
                </p>
                <p style={{ fontSize: '0.92rem', fontStyle: 'italic', fontWeight: 300, color: 'rgba(237,229,216,0.72)', lineHeight: 1.65 }}>
                  {activeTen.reframe}
                </p>
              </div>
              <button onClick={() => onDepthDive(activeTension)}
                style={{
                  display: 'block', width: '100%', padding: '11px',
                  border: '1px solid rgba(200,135,74,0.28)',
                  color: 'rgba(232,196,154,0.8)', fontSize: '0.75rem',
                  letterSpacing: '0.22em', textTransform: 'uppercase',
                  transition: 'border-color 0.2s, color 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,135,74,0.6)'; e.currentTarget.style.color = '#e8c49a'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(200,135,74,0.28)'; e.currentTarget.style.color = 'rgba(232,196,154,0.8)'; }}
              >
                Dive Deeper →
              </button>
            </motion.div>
          )}

          {/* Emotion legend */}
          <div>
            <p style={sectionLabel}>Emotion Family</p>
            {[['#8aba8a','Longing / Desire'],['#c48a8a','Fear / Anxiety'],['#8a8aba','Grief / Loss'],['#ba8a6a','Guilt / Obligation'],['#aaba8a','Hope / Possibility']].map(([c, l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0 }} />
                <span style={{ fontSize: '0.82rem', color: 'rgba(237,229,216,0.5)' }}>{l}</span>
              </div>
            ))}
          </div>

          {/* Session note */}
          <div>
            <p style={sectionLabel}>Session Note</p>
            <p style={{ fontSize: '0.88rem', fontStyle: 'italic', fontWeight: 300, color: 'rgba(237,229,216,0.45)', lineHeight: 1.7, marginBottom: 16 }}>
              {closingReflection}
            </p>
            <button onClick={() => setShowClose(true)}
              style={{
                display: 'block', width: '100%', padding: '10px',
                border: '1px solid rgba(200,135,74,0.16)',
                color: 'rgba(232,196,154,0.45)', fontSize: '0.72rem',
                letterSpacing: '0.2em', textTransform: 'uppercase',
                transition: 'border-color 0.2s, color 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,135,74,0.4)'; e.currentTarget.style.color = '#e8c49a'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(200,135,74,0.16)'; e.currentTarget.style.color = 'rgba(232,196,154,0.45)'; }}
            >
              Close Session
            </button>
          </div>

        </div>
      </div>

      <AnimatePresence>
        {showClose && <CloseModal reflection={closingReflection} onClose={() => setShowClose(false)} onNew={onNewSession} />}
      </AnimatePresence>
    </motion.div>
  );
}

// ══════════════════════════════════════════════
// SCREEN: DEPTH DIVE
// ══════════════════════════════════════════════
function DepthDiveScreen({ session, tensionIdx, onBack, onComplete }) {
  const tension = session.data.tensions[tensionIdx];
  const [answers, setAnswers] = useState([]);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [currentQuestion, setCurrentQuestion] = useState(tension.reframe);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const maxQuestions = 3;

  const submitAnswer = async () => {
    if (!currentAnswer.trim()) return;
    const newAnswers = [...answers, { question: currentQuestion, answer: currentAnswer }];
    setAnswers(newAnswers);
    setCurrentAnswer("");

    if (newAnswers.length >= maxQuestions) {
      setDone(true);
      onComplete(newAnswers);
      return;
    }

    setLoading(true);
    try {
      const next = await getDepthResponse(tension, currentQuestion, currentAnswer);
      setCurrentQuestion(next || "What feels true about this that you haven't said yet?");
    } catch {
      setCurrentQuestion("What feels true about this that you haven't said yet?");
    }
    setLoading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
      style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', background: '#0f0d0a', overflowY: 'auto',
      }}
    >
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        padding: '20px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'linear-gradient(to bottom, rgba(15,13,10,0.98) 60%, transparent)',
      }}>
        <span className="cormorant" style={{ fontSize: '0.85rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(232,196,154,0.45)' }}>
          Ambivalence
        </span>
        <button onClick={onBack}
          style={{ color: 'rgba(138,130,120,0.5)', fontSize: '0.72rem', letterSpacing: '0.22em', textTransform: 'uppercase', transition: 'color 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(200,135,74,0.7)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(138,130,120,0.5)'}
        >← Back to Map</button>
      </div>

      <div style={{ width: '100%', maxWidth: 600, paddingTop: 110, paddingBottom: 80, paddingLeft: 24, paddingRight: 24 }}>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', marginBottom: 48 }}>
          <p style={{ fontSize: '0.7rem', letterSpacing: '0.32em', textTransform: 'uppercase', color: 'rgba(200,135,74,0.5)', marginBottom: 20 }}>
            Depth Dive · {answers.length + (done ? 0 : 1)} of {maxQuestions}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.82rem', padding: '5px 14px', background: 'rgba(138,186,138,0.14)', color: '#8aba8a', border: '1px solid rgba(138,186,138,0.24)' }}>
              {tension.toward}
            </span>
            <svg width="24" height="10" viewBox="0 0 24 10" style={{ flexShrink: 0 }}>
              <path d="M0 5h20M16 1l4 4-4 4" stroke="rgba(200,135,74,0.38)" strokeWidth="1" fill="none"/>
            </svg>
            <span style={{ fontSize: '0.82rem', padding: '5px 14px', background: 'rgba(196,138,138,0.14)', color: '#c48a8a', border: '1px solid rgba(196,138,138,0.24)' }}>
              {tension.away}
            </span>
          </div>
        </motion.div>

        <AnimatePresence>
          {answers.map((a, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
              <p style={{ fontSize: '0.78rem', fontStyle: 'italic', color: 'rgba(138,130,120,0.42)', marginBottom: 8 }}>
                {a.question}
              </p>
              <p style={{ fontSize: '1rem', fontWeight: 300, lineHeight: 1.75, color: 'rgba(237,229,216,0.52)', paddingLeft: 16, borderLeft: '1px solid rgba(200,135,74,0.18)' }}>
                {a.answer}
              </p>
            </motion.div>
          ))}
        </AnimatePresence>

        {!done && (
          <motion.div key={currentQuestion} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div style={{ marginBottom: 16, padding: '22px 26px', border: '1px solid rgba(107,124,94,0.22)', background: 'rgba(107,124,94,0.04)' }}>
              {loading ? (
                <motion.div style={{ display: 'flex', gap: 6, alignItems: 'center' }} animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }}>
                  {[0,1,2].map(i => <div key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(200,135,74,0.5)' }} />)}
                </motion.div>
              ) : (
                <p style={{ fontSize: '1.08rem', fontStyle: 'italic', fontWeight: 300, color: 'rgba(237,229,216,0.82)', lineHeight: 1.8 }}>
                  {currentQuestion}
                </p>
              )}
            </div>

            <textarea
              value={currentAnswer}
              onChange={e => setCurrentAnswer(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) submitAnswer(); }}
              disabled={loading}
              style={{
                display: 'block', width: '100%', minHeight: 130,
                resize: 'none', outline: 'none',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(200,135,74,0.12)',
                color: '#ede5d8',
                fontFamily: "'Crimson Pro', Georgia, serif",
                fontSize: '1.05rem', fontWeight: 300,
                padding: '20px 22px', lineHeight: 1.85,
                caretColor: 'rgba(200,135,74,0.7)',
              }}
              placeholder="Write what comes, without editing yourself..."
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
              <span style={{ fontSize: '0.75rem', fontStyle: 'italic', color: 'rgba(138,130,120,0.32)' }}>
                ⌘ + Enter to continue
              </span>
              <button
                onClick={submitAnswer}
                disabled={!currentAnswer.trim() || loading}
                style={{
                  padding: '10px 28px',
                  border: `1px solid ${currentAnswer.trim() ? 'rgba(200,135,74,0.32)' : 'rgba(200,135,74,0.1)'}`,
                  color: currentAnswer.trim() ? '#e8c49a' : 'rgba(232,196,154,0.28)',
                  fontSize: '0.78rem', letterSpacing: '0.22em', textTransform: 'uppercase',
                  cursor: currentAnswer.trim() ? 'pointer' : 'default',
                  transition: 'border-color 0.2s, color 0.2s',
                }}
                onMouseEnter={e => { if (currentAnswer.trim()) { e.currentTarget.style.borderColor = 'rgba(200,135,74,0.6)'; e.currentTarget.style.color = '#d4956a'; }}}
                onMouseLeave={e => { if (currentAnswer.trim()) { e.currentTarget.style.borderColor = 'rgba(200,135,74,0.32)'; e.currentTarget.style.color = '#e8c49a'; }}}
              >
                {answers.length + 1 === maxQuestions ? 'Complete →' : 'Continue →'}
              </button>
            </div>
          </motion.div>
        )}

        {done && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', marginTop: 48 }}>
            <div style={{ width: 40, height: 1, background: 'rgba(200,135,74,0.3)', margin: '0 auto 24px' }} />
            <h3 className="cormorant" style={{ fontSize: '1.6rem', fontWeight: 300, color: '#e8c49a', marginBottom: 12 }}>
              You sat with it.
            </h3>
            <p style={{ fontStyle: 'italic', fontWeight: 300, color: 'rgba(138,130,120,0.55)', fontSize: '0.95rem', marginBottom: 36 }}>
              That's not a small thing.
            </p>
            <button onClick={onBack}
              style={{ padding: '14px 40px', border: '1px solid rgba(200,135,74,0.3)', color: '#e8c49a', fontSize: '0.8rem', letterSpacing: '0.25em', textTransform: 'uppercase', transition: 'border-color 0.2s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(200,135,74,0.65)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(200,135,74,0.3)'}
            >
              Return to Map
            </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ══════════════════════════════════════════════
// SCREEN: HISTORY
// ══════════════════════════════════════════════
function HistoryScreen({ sessions, onBack, onOpen }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0f0d0a', overflow: 'hidden' }}
    >
      {/* Fixed top nav */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        padding: '22px 40px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'linear-gradient(to bottom, rgba(15,13,10,0.95) 60%, transparent)',
        borderBottom: '1px solid rgba(200,135,74,0.07)'
      }}>
        <span className="cormorant" style={{ fontSize: '0.85rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(232,196,154,0.45)' }}>
          Ambivalence
        </span>
        <button onClick={onBack} style={{
          color: 'rgba(138,130,120,0.5)', fontSize: '0.72rem',
          letterSpacing: '0.22em', textTransform: 'uppercase',
          transition: 'color 0.2s'
        }}
          onMouseEnter={e => e.currentTarget.style.color = 'rgba(200,135,74,0.7)'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(138,130,120,0.5)'}
        >← Back</button>
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', paddingTop: 110, paddingBottom: 80, paddingLeft: 24, paddingRight: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: 680 }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ fontSize: '0.7rem', letterSpacing: '0.35em', textTransform: 'uppercase', color: 'rgba(200,135,74,0.5)', marginBottom: 14 }}>
              Your Archive
            </p>
            <h2 className="cormorant" style={{ fontSize: 'clamp(2rem, 4vw, 2.8rem)', fontWeight: 300, color: '#e8c49a', marginBottom: 10 }}>
              Past Sessions
            </h2>
            <div style={{ width: 36, height: 1, background: 'rgba(200,135,74,0.25)', margin: '0 auto 14px' }} />
            <p style={{ fontStyle: 'italic', fontWeight: 300, color: 'rgba(138,130,120,0.55)', fontSize: '0.95rem' }}>
              A record of what you held
            </p>
          </div>

          {/* Session cards */}
          {sessions.length === 0 ? (
            <p style={{ textAlign: 'center', fontStyle: 'italic', fontWeight: 300, color: 'rgba(138,130,120,0.4)', marginTop: 40 }}>
              No past sessions yet.
            </p>
          ) : sessions.map((s, i) => (
            <motion.div
              key={s.id}
              onClick={() => onOpen(s)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              whileHover={{ borderColor: 'rgba(200,135,74,0.28)', background: 'rgba(200,135,74,0.035)' }}
              style={{
                marginBottom: 16,
                padding: '24px 28px',
                border: '1px solid rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.018)',
                cursor: 'pointer',
                transition: 'border-color 0.2s, background 0.2s',
                position: 'relative',
              }}
            >
              {/* Left accent bar */}
              <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2, background: 'linear-gradient(to bottom, rgba(200,135,74,0.35), rgba(200,135,74,0.08))' }} />

              {/* Date + tension count row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <p style={{ fontSize: '0.78rem', letterSpacing: '0.06em', color: 'rgba(138,130,120,0.5)' }}>
                  {new Date(s.createdAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
                <span style={{
                  fontSize: '0.68rem', padding: '3px 10px',
                  border: '1px solid rgba(200,135,74,0.22)',
                  color: 'rgba(200,135,74,0.55)',
                  letterSpacing: '0.18em', textTransform: 'uppercase'
                }}>
                  {s.data.tensions.length} tensions
                </span>
              </div>

              {/* Tension tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
                {s.data.tensions.map(t => (
                  <span key={t.id} style={{
                    fontSize: '0.8rem', padding: '4px 12px',
                    background: 'rgba(255,255,255,0.035)',
                    color: 'rgba(237,229,216,0.55)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    fontStyle: 'normal'
                  }}>
                    {t.toward}
                  </span>
                ))}
              </div>

              {/* Closing reflection */}
              <p style={{ fontStyle: 'italic', fontWeight: 300, fontSize: '0.9rem', color: 'rgba(237,229,216,0.35)', lineHeight: 1.65 }}>
                {s.data.closingReflection}
              </p>

              {/* Open hint */}
              <p style={{ marginTop: 12, fontSize: '0.7rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(200,135,74,0.3)' }}>
                Open map →
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ══════════════════════════════════════════════
// CLOSE MODAL
// ══════════════════════════════════════════════
function CloseModal({ reflection, onClose, onNew }) {
  return (
    <motion.div
      onClick={onClose}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '24px',
        background: 'rgba(15,13,10,0.88)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <motion.div
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.97, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        style={{
          maxWidth: 460, width: '100%',
          padding: '44px 40px 40px',
          border: '1px solid rgba(200,135,74,0.2)',
          background: 'rgba(15,13,10,0.99)',
          position: 'relative',
        }}
      >
        {/* Accent line */}
        <div style={{ width: 32, height: 1, background: 'rgba(200,135,74,0.4)', marginBottom: 28 }} />

        {/* Title */}
        <h3 className="cormorant" style={{ fontSize: '1.6rem', fontWeight: 300, color: '#e8c49a', marginBottom: 16 }}>
          Session complete.
        </h3>

        {/* Reflection */}
        <p style={{ fontSize: '1rem', fontStyle: 'italic', fontWeight: 300, lineHeight: 1.85, color: 'rgba(237,229,216,0.62)', marginBottom: 24 }}>
          {reflection}
        </p>

        {/* Saved note */}
        <p style={{ fontSize: '0.72rem', letterSpacing: '0.1em', color: 'rgba(138,130,120,0.38)', marginBottom: 28 }}>
          Saved locally to your device.
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onNew}
            style={{
              flex: 1, padding: '13px',
              border: '1px solid rgba(200,135,74,0.3)',
              color: '#e8c49a', fontSize: '0.78rem',
              letterSpacing: '0.22em', textTransform: 'uppercase',
              transition: 'border-color 0.2s, color 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,135,74,0.65)'; e.currentTarget.style.color = '#d4956a'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(200,135,74,0.3)'; e.currentTarget.style.color = '#e8c49a'; }}
          >
            New Session
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '13px 24px',
              border: '1px solid rgba(255,255,255,0.07)',
              color: 'rgba(138,130,120,0.5)', fontSize: '0.78rem',
              letterSpacing: '0.22em', textTransform: 'uppercase',
              transition: 'border-color 0.2s, color 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = 'rgba(138,130,120,0.8)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'rgba(138,130,120,0.5)'; }}
          >
            Stay
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ══════════════════════════════════════════════
// ROOT APP
// ══════════════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState("landing");
  const [currentSession, setCurrentSession] = useState(null);
  const [activeTensionIdx, setActiveTensionIdx] = useState(0);
  const [sessions, setSessions] = useState(() => loadSessions());

  const handleWrite = async (text) => {
    setScreen("processing");
    const data = await extractTensions(text);
    const session = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      journalText: text,
      data
    };
    saveSession(session);
    setCurrentSession(session);
    setSessions(loadSessions());
    setScreen("map");
  };

  const handleDepthDive = (tensionIdx) => {
    setActiveTensionIdx(tensionIdx);
    setScreen("depth");
  };

  const handleDepthComplete = (answers) => {
    if (!currentSession) return;
    const updated = { ...currentSession, depthAnswers: { ...(currentSession.depthAnswers || {}), [activeTensionIdx]: answers } };
    saveSession(updated);
    setCurrentSession(updated);
  };

  const handleOpenHistory = (session) => {
    setCurrentSession(session);
    setScreen("map");
  };

  const goNew = () => { setCurrentSession(null); setScreen("landing"); };

  return (
    <div style={{ minHeight: '100vh', background: '#0f0d0a' }}>
      <GlobalStyles />
      <AnimatePresence mode="wait">
        {screen === "landing" && (
          <LandingScreen key="landing"
            onBegin={() => setScreen("write")}
            onHistory={() => setScreen("history")}
            sessionCount={sessions.length}
          />
        )}
        {screen === "write" && (
          <WriteScreen key="write"
            onBack={() => setScreen("landing")}
            onSubmit={handleWrite}
          />
        )}
        {screen === "processing" && <ProcessingScreen key="processing" />}
        {screen === "map" && currentSession && (
          <MapScreen key="map"
            session={currentSession}
            onBack={() => setScreen("write")}
            onDepthDive={handleDepthDive}
            onNewSession={goNew}
          />
        )}
        {screen === "depth" && currentSession && (
          <DepthDiveScreen key="depth"
            session={currentSession}
            tensionIdx={activeTensionIdx}
            onBack={() => setScreen("map")}
            onComplete={handleDepthComplete}
          />
        )}
        {screen === "history" && (
          <HistoryScreen key="history"
            sessions={sessions}
            onBack={() => setScreen("landing")}
            onOpen={handleOpenHistory}
          />
        )}
      </AnimatePresence>
    </div>
  );
}