// ... (Ganti SELURUH isi src/App.tsx Anda dengan kode ini) ...
import { useState, useEffect } from 'react'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import '@blocknote/core/fonts/inter.css'
import '@blocknote/mantine/style.css'
import './App.css'

type Note = { id: string; title: string }
type Folder = { id: string; name: string; isOpen: boolean; notes: Note[] }
type Task = { id: string; title: string; date: string; category: string; status: string }

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isDarkMode, setIsDarkMode] = useState(true)

  const [activeView, setActiveView] = useState<'dashboard' | 'note'>('dashboard')
  const [dashboardTab, setDashboardTab] = useState<'category' | 'calendar'>('category')
  const [activeNote, setActiveNote] = useState<Note | null>(null)

  const [folders, setFolders] = useState<Folder[]>([
    { id: 'f1', name: 'Pribadi', isOpen: true, notes: [{ id: 'n1', title: 'Jurnal' }] },
    { id: 'f2', name: 'Kuliah', isOpen: true, notes: [{ id: 'n2', title: 'Skripsi Bab 1' }] }
  ])

  const [tasks, setTasks] = useState<Task[]>([
    { id: '1', title: 'Basic to Advanced', date: '2026-01-26', category: 'Excel', status: 'To Do' },
    { id: '2', title: 'jobseeker toolkit', date: '2026-01-28', category: 'Kuliah', status: 'To Do' },
    { id: '3', title: 'ManPro week 1', date: '2026-02-03', category: 'Manpro', status: 'To Do' },
  ])

  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [isTimerRunning, setIsTimerRunning] = useState(false)

  // State Modal Task Dinamis
  const [taskModal, setTaskModal] = useState<{
    isOpen: boolean;
    defaultCategory: string;
    defaultDate: string;
  }>({ isOpen: false, defaultCategory: '', defaultDate: new Date().toISOString().split('T')[0] })

  const editor = useCreateBlockNote()

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  useEffect(() => {
    let interval: number | undefined
    if (isTimerRunning && timeLeft > 0) {
      interval = setInterval(() => setTimeLeft(prev => prev - 1), 1000)
    } else if (timeLeft === 0) setIsTimerRunning(false)
    return () => clearInterval(interval)
  }, [isTimerRunning, timeLeft])

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)
  const toggleTheme = () => setIsDarkMode(!isDarkMode)
  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`

  // Handler Buka Modal Task dengan Konteks
  const openTaskModal = (category: string = '', date: string = new Date().toISOString().split('T')[0]) => {
    setTaskModal({ isOpen: true, defaultCategory: category, defaultDate: date })
  }

  // Submit Modal Task
  const handleTaskSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const newTask: Task = {
      id: Date.now().toString(),
      title: formData.get('title') as string,
      category: formData.get('category') as string,
      date: formData.get('date') as string,
      status: 'To Do'
    }
    setTasks([...tasks, newTask])
    setTaskModal({ ...taskModal, isOpen: false })
  }

  const today = new Date()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay()
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

  // Ambil list unik kategori
  const uniqueCategories = Array.from(new Set(tasks.map(t => t.category)))

  return (
    <div className="app-container">
      <div className="aurora-bg"></div>

      <aside className={isSidebarOpen ? 'sidebar' : 'sidebar closed'}>
        <div className="user-profile">
          <div className="avatar">P</div>
          <div className="user-info">
            <span className="user-name">Pengguna Aktif</span>
            <span className="user-plan">Ruang Kerja Privat</span>
          </div>
        </div>

        <ul className="nav-list">
          <li className={"nav-item " + (activeView === 'dashboard' ? 'active' : '')} onClick={() => setActiveView('dashboard')}>
            📺 Dashboard
          </li>

          <li style={{ marginTop: '1rem' }}><button className="btn-add-folder">+ Folder Baru</button></li>
          {folders.map(folder => (
            <li key={folder.id} className="folder-wrapper">
              <div className="folder-header">
                <span className="folder-icon">📂</span>
                <span className="folder-name">{folder.name}</span>
              </div>
              <ul className="folder-content">
                {folder.notes.map(note => (
                  <li key={note.id} className={"note-item " + (activeNote?.id === note.id ? 'active' : '')} onClick={() => { setActiveNote(note); setActiveView('note') }}>
                    📝 {note.title}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>

        <div className="pomodoro-widget">
          <div className="timer-label">Fokus Timer</div>
          <div className="timer-display">{formatTime(timeLeft)}</div>
          <button className="btn-timer" onClick={() => setIsTimerRunning(!isTimerRunning)}>{isTimerRunning ? 'Jeda' : 'Mulai'}</button>
          <button className="btn-timer" onClick={() => { setIsTimerRunning(false); setTimeLeft(25 * 60) }}>Reset</button>
        </div>

        <div className="theme-wrapper">
          <span className="theme-label">Mode Gelap</span>
          <button className={`toggle-switch ${isDarkMode ? 'active' : ''}`} onClick={toggleTheme}><div className="toggle-handle"></div></button>
        </div>
      </aside>

      <main className="editor-area">
        <header className="editor-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {!isSidebarOpen && <button className="btn-graph" onClick={toggleSidebar}>Menu</button>}
            <span className="breadcrumb">Ruang Kerja / {activeView === 'dashboard' ? 'Notes' : activeNote?.title}</span>
          </div>
        </header>

        {activeView === 'dashboard' ? (
          <div className="dashboard-view">
            <div className="dashboard-title">
              <h1>💻 Notes</h1>
            </div>

            {/* TAB NAVIGASI */}
            <div className="view-tabs">
              <button className={`view-tab ${dashboardTab === 'category' ? 'active' : ''}`} onClick={() => setDashboardTab('category')}>🗂️ By Category</button>
              <button className={`view-tab ${dashboardTab === 'calendar' ? 'active' : ''}`} onClick={() => setDashboardTab('calendar')}>📅 Calendar</button>
            </div>

            {/* TAMPILAN 1: BY CATEGORY */}
            {dashboardTab === 'category' && (
              <div className="category-views">
                {uniqueCategories.map(category => (
                  <div key={category} className="category-group">
                    <div className="category-header">
                      <span style={{ fontSize: '0.8rem' }}>▼</span>
                      <span className="category-pill">{category}</span>
                    </div>
                    <div className="task-list-header">
                      <span>Aa Meeting name</span>
                      <span>📅 Date</span>
                    </div>
                    {tasks.filter(t => t.category === category).map(task => (
                      <div key={task.id} className="task-row">
                        <span className="task-title">📄 {task.title}</span>
                        <span className="task-date">{new Date(task.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    ))}
                    {/* Tombol Add dengan konteks Kategori */}
                    <button className="btn-inline-add" onClick={() => openTaskModal(category, '')}>
                      + New meeting
                    </button>
                  </div>
                ))}
                <button className="btn-inline-add" style={{ marginTop: '2rem' }} onClick={() => openTaskModal('', '')}>
                  + Add new category group
                </button>
              </div>
            )}

            {/* TAMPILAN 2: CALENDAR */}
            {dashboardTab === 'calendar' && (
              <div className="calendar-views">
                <h3 style={{ marginBottom: '1rem' }}>{monthNames[currentMonth]} {currentYear}</h3>
                <div className="calendar-header-row">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
                </div>
                <div className="calendar-grid">
                  {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} className="cal-day empty"></div>)}
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                    const dayTasks = tasks.filter(t => t.date === dateStr)
                    const isToday = day === today.getDate()

                    return (
                      <div key={day} className={`cal-day ${isToday ? 'today' : ''}`}>
                        <div className="day-header">
                          <span className="day-num">{day}</span>
                          {/* Tombol Add dengan konteks Tanggal */}
                          <button className="cal-add-btn" onClick={() => openTaskModal('', dateStr)}>+</button>
                        </div>
                        {dayTasks.map(t => (
                          <div key={t.id} className="event-badge">📄 {t.title}</div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          <article className="document-content">
            <input className="document-title-input" value={activeNote?.title || ''} readOnly />
            <div style={{ marginTop: '2rem', marginLeft: '-3rem' }}>
              <BlockNoteView editor={editor} theme={isDarkMode ? 'dark' : 'light'} />
            </div>
          </article>
        )}
      </main>

      {/* MODAL TUGAS PINTAR */}
      {taskModal.isOpen && (
        <div className="modal-overlay" onClick={() => setTaskModal({ ...taskModal, isOpen: false })}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Tambah Data Baru</h3>
            <form onSubmit={handleTaskSubmit}>
              <div className="form-group">
                <label>Nama Meeting / Tugas</label>
                <input name="title" className="form-control" autoFocus required placeholder="Contoh: Skripsi Bab 2" />
              </div>
              <div className="form-group">
                <label>Kategori</label>
                {/* Default value diisi otomatis dari parameter klik */}
                <input name="category" className="form-control" defaultValue={taskModal.defaultCategory} required placeholder="Contoh: Kuliah" />
              </div>
              <div className="form-group">
                <label>Tanggal</label>
                {/* Default value diisi otomatis dari parameter klik */}
                <input type="date" name="date" className="form-control" defaultValue={taskModal.defaultDate} required />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setTaskModal({ ...taskModal, isOpen: false })}>Batal</button>
                <button type="submit" className="btn-primary">Simpan</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App