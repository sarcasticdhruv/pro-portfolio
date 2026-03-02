import { useState, useEffect } from 'react';
import { useGitHub } from '../hooks/useGitHub';
import Hero from '../components/Hero';
import About from '../components/About';
import Experience from '../components/Experience';
import Projects from '../components/Projects';
import Skills from '../components/Skills';
import Achievements from '../components/Achievements';
import Contact from '../components/Contact';

export default function HomePage() {
  const github = useGitHub();

  return (
    <>
      <ScrollProgress />
      <main>
        <Hero github={github} />
        <div className="divider" />
        <About />
        <div className="divider" />
        <Experience />
        <div className="divider" />
        <Projects github={github} />
        <div className="divider" />
        <Skills />
        <div className="divider" />
        <Achievements />
        <div className="divider" />
        <Contact />
      </main>
    </>
  );
}

function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const doc = document.documentElement;
      const scrolled = doc.scrollTop;
      const total = doc.scrollHeight - doc.clientHeight;
      setProgress(total > 0 ? (scrolled / total) * 100 : 0);
    };
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0,
      width: `${progress}%`, height: '2px',
      background: 'var(--accent)', zIndex: 200,
      transition: 'width 0.1s ease',
      boxShadow: '0 0 8px var(--accent)',
    }} />
  );
}
