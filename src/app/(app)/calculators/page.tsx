'use client'

import { useState, useCallback } from 'react'
import { Calculator, Plus, Trash2, RotateCcw } from 'lucide-react'

// GPA Scale: 10-point HBTU scale
const gradePoints: Record<string, number> = {
  'O': 10, 'A+': 9, 'A': 8, 'B+': 7, 'B': 6, 'C': 5, 'P': 4, 'F': 0
}

interface SubjectEntry {
  id: number
  name: string
  credits: string
  grade: string
}

function GPACalculator() {
  const [subjects, setSubjects] = useState<SubjectEntry[]>([
    { id: 1, name: '', credits: '', grade: 'O' },
    { id: 2, name: '', credits: '', grade: 'O' },
    { id: 3, name: '', credits: '', grade: 'O' },
  ])

  const addSubject = () => {
    setSubjects([...subjects, { id: Date.now(), name: '', credits: '', grade: 'O' }])
  }

  const removeSubject = (id: number) => {
    if (subjects.length > 1) setSubjects(subjects.filter((s) => s.id !== id))
  }

  const updateSubject = (id: number, field: keyof SubjectEntry, value: string) => {
    setSubjects(subjects.map((s) => (s.id === id ? { ...s, [field]: value } : s)))
  }

  const calculate = useCallback(() => {
    let totalWeightedPoints = 0
    let totalCredits = 0
    for (const s of subjects) {
      const cr = parseFloat(s.credits)
      if (!isNaN(cr) && cr > 0 && s.grade in gradePoints) {
        totalWeightedPoints += cr * gradePoints[s.grade]
        totalCredits += cr
      }
    }
    return totalCredits > 0 ? (totalWeightedPoints / totalCredits).toFixed(2) : '--'
  }, [subjects])

  return (
    <div className="glass-card" style={{ padding: '1.5rem' }}>
      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Calculator size={18} color="#4f46e5" />
        SGPA / GPA Calculator
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
        {subjects.map((sub) => (
          <div key={sub.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 40px', gap: '0.5rem', alignItems: 'center' }}>
            <input
              className="form-input"
              placeholder="Subject name"
              value={sub.name}
              onChange={(e) => updateSubject(sub.id, 'name', e.target.value)}
              style={{ fontSize: '0.8125rem' }}
            />
            <input
              className="form-input"
              placeholder="Credits"
              type="number"
              min="0"
              max="10"
              value={sub.credits}
              onChange={(e) => updateSubject(sub.id, 'credits', e.target.value)}
              style={{ fontSize: '0.8125rem', textAlign: 'center' }}
            />
            <select
              className="form-select"
              value={sub.grade}
              onChange={(e) => updateSubject(sub.id, 'grade', e.target.value)}
              style={{ fontSize: '0.8125rem' }}
            >
              {Object.keys(gradePoints).map((g) => (
                <option key={g} value={g}>{g} ({gradePoints[g]})</option>
              ))}
            </select>
            <button
              onClick={() => removeSubject(sub.id)}
              style={{ background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer', padding: 4 }}
              aria-label="Remove subject"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button onClick={addSubject} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>
          <Plus size={14} style={{ marginRight: 4 }} /> Add Subject
        </button>
        <button onClick={() => setSubjects([{ id: 1, name: '', credits: '', grade: 'O' }])} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}>
          <RotateCcw size={14} style={{ marginRight: 4 }} /> Reset
        </button>
      </div>

      <div style={{
        padding: '1rem',
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-md)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Your SGPA</div>
        <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#4f46e5', lineHeight: 1.2 }}>{calculate()}</div>
      </div>
    </div>
  )
}

function AttendanceCalculator() {
  const [attended, setAttended] = useState('')
  const [total, setTotal] = useState('')

  const att = parseFloat(attended)
  const tot = parseFloat(total)
  const percentage = !isNaN(att) && !isNaN(tot) && tot > 0 ? ((att / tot) * 100).toFixed(1) : '--'
  const isLow = typeof percentage === 'string' && percentage !== '--' && parseFloat(percentage) < 75

  // Classes needed to reach 75%
  let classesNeeded = 0
  if (!isNaN(att) && !isNaN(tot) && tot > 0 && parseFloat(percentage as string) < 75) {
    classesNeeded = Math.ceil((0.75 * tot - att) / (1 - 0.75))
  }

  return (
    <div className="glass-card" style={{ padding: '1.5rem' }}>
      <h2 style={{ fontSize: '1.125rem', fontWeight: 700, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Calculator size={18} color="#10b981" />
        Attendance Calculator
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Classes Attended</label>
          <input className="form-input" type="number" min="0" value={attended} onChange={(e) => setAttended(e.target.value)} placeholder="e.g. 42" />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Total Classes</label>
          <input className="form-input" type="number" min="0" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="e.g. 60" />
        </div>
      </div>

      <div style={{
        padding: '1rem',
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-md)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', fontWeight: 600 }}>Attendance</div>
        <div style={{ fontSize: '2.5rem', fontWeight: 900, color: isLow ? '#e11d48' : '#10b981', lineHeight: 1.2 }}>
          {percentage}{percentage !== '--' ? '%' : ''}
        </div>
        {isLow && classesNeeded > 0 && (
          <p style={{ fontSize: '0.75rem', color: '#e11d48', marginTop: 6, fontWeight: 600 }}>
            ⚠️ Attend {classesNeeded} more classes to reach 75%
          </p>
        )}
      </div>
    </div>
  )
}

export default function CalculatorsPage() {
  return (
    <div style={{ padding: '2rem 1.5rem' }}>
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span className="badge badge-indigo" style={{ padding: '0.3rem 0.75rem', fontWeight: 700 }}>
            Academic Tools
          </span>
        </div>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 800,
          fontFamily: 'var(--font-display)',
          letterSpacing: '-0.025em',
          marginBottom: 6,
        }}>
          Academic Calculators
        </h1>
        <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
          GPA, SGPA, CGPA, and attendance calculators for HBTU students.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <GPACalculator />
        <AttendanceCalculator />
      </div>
    </div>
  )
}
