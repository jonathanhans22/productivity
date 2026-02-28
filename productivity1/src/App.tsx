import { useState, useEffect, forwardRef } from 'react'
import { CircleProgress } from './components/CircleProgress'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import { DragDropContext, Droppable, Draggable, type DropResult, type DroppableProps } from '@hello-pangea/dnd'
import { PiTelevision, PiFolder, PiNotePencil, PiStack, PiCalendar, PiTimer, PiMoon, PiSun, PiPlus, PiList, PiPencilSimple, PiTrash, PiCaretDown, PiFilePlus, PiSquaresFour, PiImage, PiSmiley, PiTag, PiCheckCircle, PiWarningCircle, PiX } from 'react-icons/pi'
import '@blocknote/core/fonts/inter.css'
import '@blocknote/mantine/style.css'
import './App.css'
import { supabase } from './lib/supabase'

// 1. Tipe Data Diperbarui dengan 'content'
type Note = { id: string; title: string; type: 'note' | 'canvas'; content?: any }
type Folder = { id: string; name: string; isOpen: boolean; notes: Note[]; color: string }
type Task = { id: string; title: string; date: string; category: string; status: string }

// 2. Komponen Khusus untuk Editor agar Auto-Save ke Supabase
function EditorWrapper({ note, isDarkMode }: { note: Note, isDarkMode: boolean }) {
  // Parse konten dari Supabase ke JSON yang dipahami BlockNote
  const initialContent = note.content && typeof note.content === 'string' 
    ? JSON.parse(note.content) 
    : (typeof note.content === 'object' ? note.content : undefined);

  const editor = useCreateBlockNote({ initialContent });

  const handleEditorChange = async () => {
    // Ambil isi dokumen saat ini
    const content = JSON.stringify(editor.document);
    // Auto-save diam-diam ke Supabase
    await supabase.from('notes').update({ content }).eq('id', note.id);
  };

  return (
    <BlockNoteView 
      editor={editor} 
      theme={isDarkMode ? 'dark' : 'light'} 
      onChange={handleEditorChange} 
    />
  );
}

// Komponen Input Tanggal Custom
const CustomDateInput = forwardRef<HTMLInputElement, any>(({ value, onClick }, ref) => (
  <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
    <PiCalendar style={{ position: 'absolute', left: '12px', color: 'var(--text-secondary)', fontSize: '1.2rem', pointerEvents: 'none', zIndex: 1 }} />
    <input
      type="text"
      className="form-control"
      style={{ paddingLeft: '38px', cursor: 'pointer', width: '100%' }}
      value={value}
      onClick={onClick}
      ref={ref}
      readOnly
      placeholder="Pilih Tanggal..."
    />
  </div>
));

export const StrictModeDroppable = ({ children, ...props }: DroppableProps) => {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);
  if (!enabled) return null;
  return <Droppable {...props}>{children}</Droppable>;
};

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [isDarkMode, setIsDarkMode] = useState(true)

  const isDark = isDarkMode || document.documentElement.getAttribute('data-theme') === 'dark';

  // State Data Kosong (Akan diisi otomatis dari DB)
  const [folders, setFolders] = useState<Folder[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [goals, setGoals] = useState<{ id: string; text: string; done: boolean; mode: 'daily' | 'weekly' }[]>([]);

  // Mengambil Data dari Supabase Saat Aplikasi Dibuka
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Fetch Tasks
    const { data: tasksData } = await supabase.from('tasks').select('*');
    if (tasksData) setTasks(tasksData as Task[]);

    // Fetch Goals
    const { data: goalsData } = await supabase.from('goals').select('*').order('created_at', { ascending: true });
    if (goalsData) {
      setGoals(goalsData.map(g => ({ id: g.id, text: g.text, done: g.is_done, mode: g.mode as 'daily' | 'weekly' })));
    }

    // Fetch Folders beserta Notes dan Content-nya
    const { data: foldersData } = await supabase
      .from('folders')
      .select(`*, notes (*)`)
      .order('created_at', { ascending: true });

    if (foldersData) {
      const formattedFolders: Folder[] = foldersData.map((f: any) => ({
        id: f.id,
        name: f.name,
        color: f.color,
        isOpen: f.is_open,
        notes: (f.notes || []).map((n: any) => ({
          id: n.id,
          title: n.title,
          type: n.type,
          content: n.content // Data isi editor
        }))
      }));
      setFolders(formattedFolders);
    }
  };

  const [goalMode, setGoalMode] = useState<'daily' | 'weekly'>('daily');
  const [goalInput, setGoalInput] = useState('');

  const filteredGoals = goals.filter(g => g.mode === goalMode);
  const progress = filteredGoals.length === 0 ? 0 : Math.round(filteredGoals.filter(g => g.done).length / filteredGoals.length * 100);

  const [activeView, setActiveView] = useState<'dashboard' | 'note'>('dashboard')
  const [dashboardTab, setDashboardTab] = useState<'category' | 'calendar'>('category')
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({})

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; folderId: string } | null>(null)
  const [noteContextMenu, setNoteContextMenu] = useState<{ x: number; y: number; noteId: string; folderId: string } | null>(null)
  const [renameModal, setRenameModal] = useState<{ isOpen: boolean; folderId: string; currentName: string; currentColor: string }>({ isOpen: false, folderId: '', currentName: '', currentColor: '' })
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; folderId: string; folderName: string }>({ isOpen: false, folderId: '', folderName: '' })
  const [renameNoteModal, setRenameNoteModal] = useState<{ isOpen: boolean; folderId: string; noteId: string; currentTitle: string }>({ isOpen: false, folderId: '', noteId: '', currentTitle: '' })
  const [deleteNoteModal, setDeleteNoteModal] = useState<{ isOpen: boolean; folderId: string; noteId: string; noteTitle: string }>({ isOpen: false, folderId: '', noteId: '', noteTitle: '' })
  const [deleteTaskModal, setDeleteTaskModal] = useState<{ isOpen: boolean; taskId: string; taskTitle: string }>({ isOpen: false, taskId: '', taskTitle: '' })
  const [inputModal, setInputModal] = useState<{ isOpen: boolean; mode: 'create_folder' | 'create_note' | 'create_canvas'; folderId?: string }>({ isOpen: false, mode: 'create_folder' })
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' }[]>([])
  const [quickAddPopover, setQuickAddPopover] = useState<{ isOpen: boolean; target: HTMLElement | null; date: string }>({ isOpen: false, target: null, date: '' });
  const [activeNote, setActiveNote] = useState<Note | null>(null)

  const [timerDuration, setTimerDuration] = useState(25 * 60)
  const [timeLeft, setTimeLeft] = useState(25 * 60)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [showFullscreenTimer, setShowFullscreenTimer] = useState(false)
  const [showTimerSetting, setShowTimerSetting] = useState(false)

  const [taskModal, setTaskModal] = useState<{
    isOpen: boolean;
    defaultCategory: string;
    defaultDate: string;
  }>({ isOpen: false, defaultCategory: '', defaultDate: new Date().toISOString().split('T')[0] })

  const [editEventModal, setEditEventModal] = useState<{ isOpen: boolean; event: Task | null }>({ isOpen: false, event: null });
  const [eventNotes, setEventNotes] = useState<Record<string, string>>({});
  const [openEventDetail, setOpenEventDetail] = useState<{ isOpen: boolean; event: Task | null }>({ isOpen: false, event: null });
  const [eventPopover, setEventPopover] = useState<{ isOpen: boolean; target: HTMLElement | null; date: string }>({ isOpen: false, target: null, date: '' });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  useEffect(() => {
    const closeContextMenu = () => setContextMenu(null)
    const closeNoteContextMenu = () => setNoteContextMenu(null)
    if (contextMenu) {
      window.addEventListener('click', closeContextMenu)
      return () => window.removeEventListener('click', closeContextMenu)
    }
    if (noteContextMenu) {
      window.addEventListener('click', closeNoteContextMenu)
      return () => window.removeEventListener('click', closeNoteContextMenu)
    }
  }, [contextMenu, noteContextMenu])

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

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now().toString()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }

  // === FUNGSI SUPABASE CRUD PINTAR ===

  const handleAddGoal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (goalInput.trim()) {
      const { data, error } = await supabase.from('goals').insert([{ 
        text: goalInput.trim(), 
        mode: goalMode, 
        is_done: false 
      }]).select().single();
      
      if (data) {
        setGoals([...goals, { id: data.id, text: data.text, done: data.is_done, mode: data.mode }]);
        setGoalInput('');
      } else if (error) showToast('Gagal menambah goal', 'error');
    }
  };

  const toggleGoalDone = async (goalId: string, currentStatus: boolean) => {
    setGoals(goals.map(g => g.id === goalId ? { ...g, done: !currentStatus } : g));
    await supabase.from('goals').update({ is_done: !currentStatus }).eq('id', goalId);
  };

  const handleInputSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const value = formData.get('inputValue') as string
    const color = formData.get('inputColor') as string || '#6366f1';
    if (!value) return

    if (inputModal.mode === 'create_folder') {
      const { data, error } = await supabase.from('folders').insert([{ name: value, color: color, is_open: true }]).select().single();
      if (data) {
        setFolders(prev => [...prev, { id: data.id, name: data.name, isOpen: data.is_open, notes: [], color: data.color }])
        showToast('Folder berhasil dibuat')
      } else if (error) showToast('Gagal membuat folder', 'error');

    } else if (inputModal.mode === 'create_note' && inputModal.folderId) {
      const { data, error } = await supabase.from('notes').insert([{ folder_id: inputModal.folderId, title: value, type: 'note' }]).select().single();
      if (data) {
        const newNote: Note = { id: data.id, title: data.title, type: data.type }
        setFolders(prev => prev.map(f => f.id === inputModal.folderId ? { ...f, notes: [...f.notes, newNote], isOpen: true } : f))
        setActiveNote(newNote)
        setActiveView('note')
        showToast('Catatan berhasil dibuat')
      }

    } else if (inputModal.mode === 'create_canvas' && inputModal.folderId) {
      const { data, error } = await supabase.from('notes').insert([{ folder_id: inputModal.folderId, title: value, type: 'canvas' }]).select().single();
      if (data) {
        const newNote: Note = { id: data.id, title: data.title, type: data.type }
        setFolders(prev => prev.map(f => f.id === inputModal.folderId ? { ...f, notes: [...f.notes, newNote], isOpen: true } : f))
        setActiveNote(newNote)
        setActiveView('note')
        showToast('Canvas berhasil dibuat')
      }
    }
    setInputModal({ ...inputModal, isOpen: false })
  }

  const handleTaskSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const taskData = {
      title: formData.get('title') as string,
      category: formData.get('category') as string,
      date: taskModal.defaultDate,
      status: 'To Do'
    };

    const { data, error } = await supabase.from('tasks').insert([taskData]).select().single();
    if (data) {
      setTasks([...tasks, data as Task])
      setTaskModal({ ...taskModal, isOpen: false })
      showToast('Tugas berhasil ditambahkan')
    } else if (error) showToast('Gagal menambah tugas', 'error');
  }

  const handleQuickAddSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const title = formData.get('title') as string;
    if (!title) return;

    const taskData = {
      title,
      category: formData.get('category') as string,
      date: quickAddPopover.date,
      status: 'To Do'
    };

    const { data, error } = await supabase.from('tasks').insert([taskData]).select().single();
    if (data) {
      setTasks(prev => [...prev, data as Task]);
      showToast('Tugas berhasil ditambahkan');
      setQuickAddPopover({ isOpen: false, target: null, date: '' });
    }
  }

  const handleEditEventSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (!editEventModal.event) return;

    const updatedData = {
      title: formData.get('title') as string,
      category: formData.get('category') as string,
      date: editEventModal.event.date,
      status: formData.get('status') as string,
    };

    const { data, error } = await supabase.from('tasks').update(updatedData).eq('id', editEventModal.event.id).select().single();
    if (data) {
      setTasks(prev => prev.map(t => t.id === data.id ? (data as Task) : t));
      setEditEventModal({ isOpen: false, event: null });
      showToast('Event berhasil diubah');
    }
  };

  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Done' ? 'To Do' : 'Done';
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
  }

  const confirmDeleteTask = async () => {
    const taskId = deleteTaskModal.taskId;
    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (!error) {
      setTasks(prev => prev.filter(t => t.id !== taskId));
      setDeleteTaskModal({ isOpen: false, taskId: '', taskTitle: '' })
      showToast('Tugas berhasil dihapus')
    }
  }

  const confirmDeleteFolder = async () => {
    const { folderId, folderName } = deleteModal
    const { error } = await supabase.from('folders').delete().eq('id', folderId); 
    if (!error) {
      setFolders(prev => prev.filter(f => f.id !== folderId))
      setTasks(prev => prev.filter(t => t.category !== folderName))
      setDeleteModal({ isOpen: false, folderId: '', folderName: '' })
      showToast('Folder berhasil dihapus')
    }
  }

  const confirmDeleteNote = async () => {
    const { folderId, noteId } = deleteNoteModal
    const { error } = await supabase.from('notes').delete().eq('id', noteId);
    if (!error) {
      setFolders(prev => prev.map(f => {
        if (f.id === folderId) {
          return { ...f, notes: f.notes.filter(n => n.id !== noteId) }
        }
        return f
      }))
      if (activeNote?.id === noteId) {
        setActiveNote(null)
        setActiveView('dashboard')
      }
      setDeleteNoteModal({ isOpen: false, folderId: '', noteId: '', noteTitle: '' })
      showToast('Catatan berhasil dihapus')
    }
  }

  const handleRenameFolder = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const newName = formData.get('newName') as string
    const newColor = formData.get('folderColor') as string
    const { folderId, currentName: oldName, currentColor } = renameModal

    if (!newName || (newName === oldName && newColor === currentColor)) {
      setRenameModal({ isOpen: false, folderId: '', currentName: '', currentColor: '' })
      return
    }

    const { error } = await supabase.from('folders').update({ name: newName, color: newColor }).eq('id', folderId);
    if (!error) {
      if (newName !== oldName) {
         await supabase.from('tasks').update({ category: newName }).eq('category', oldName);
      }
      setFolders(prev => prev.map(f => (f.id === folderId ? { ...f, name: newName, color: newColor } : f)))
      setTasks(prev => prev.map(t => (t.category === oldName ? { ...t, category: newName } : t)))
      setRenameModal({ isOpen: false, folderId: '', currentName: '', currentColor: '' })
      showToast('Folder berhasil diubah')
    }
  }

  const handleRenameNoteSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const newTitle = formData.get('newNoteTitle') as string
    const { folderId, noteId } = renameNoteModal

    if (newTitle) {
      const { error } = await supabase.from('notes').update({ title: newTitle }).eq('id', noteId);
      if (!error) {
        setFolders(prev => prev.map(f => {
          if (f.id === folderId) {
            return { ...f, notes: f.notes.map(n => n.id === noteId ? { ...n, title: newTitle } : n) }
          }
          return f
        }))
        if (activeNote?.id === noteId) setActiveNote(prev => prev ? { ...prev, title: newTitle } : null)
        setRenameNoteModal({ isOpen: false, folderId: '', noteId: '', currentTitle: '' })
        showToast('Nama catatan berhasil diubah')
      }
    }
  }

  const toggleFolderInSidebar = async (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (folder) {
      setFolders(prev => prev.map(f => (f.id === folderId ? { ...f, isOpen: !f.isOpen } : f)))
      await supabase.from('folders').update({ is_open: !folder.isOpen }).eq('id', folderId);
    }
  }

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const taskToMove = tasks.find(t => t.id === draggableId);
    if (!taskToMove) return;

    const destFolder = folders.find(f => f.id === destination.droppableId);
    const destCategory = destFolder ? destFolder.name : taskToMove.category;

    const newTasks = tasks.filter(t => t.id !== draggableId);
    const destinationTasks = newTasks.filter(t => t.category === destCategory);

    let insertionIndex;
    if (destination.index === 0) {
      const firstTaskOfCategory = newTasks.find(t => t.category === destCategory);
      insertionIndex = firstTaskOfCategory ? newTasks.indexOf(firstTaskOfCategory) : newTasks.length;
    } else {
      const taskBefore = destinationTasks[destination.index - 1];
      insertionIndex = newTasks.indexOf(taskBefore) + 1;
    }

    newTasks.splice(insertionIndex, 0, { ...taskToMove, category: destCategory });
    setTasks(newTasks);

    if (taskToMove.category !== destCategory) {
      await supabase.from('tasks').update({ category: destCategory }).eq('id', taskToMove.id);
    }
  };

  const onNoteTitleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    if (activeNote) {
      setActiveNote({ ...activeNote, title: newTitle })
      setFolders(prev => prev.map(f => ({ ...f, notes: f.notes.map(n => n.id === activeNote.id ? { ...n, title: newTitle } : n) })))
      await supabase.from('notes').update({ title: newTitle }).eq('id', activeNote.id);
    }
  }


  // === SISA FUNGSI UI BIASA ===

  const openEventPopover = (e: React.MouseEvent, date: string) => {
    setEventPopover({ isOpen: true, target: e.currentTarget as HTMLElement, date });
  };
  const closeEventPopover = () => setEventPopover({ isOpen: false, target: null, date: '' });

  const openQuickAdd = (e: React.MouseEvent, date: string) => {
    setQuickAddPopover({ isOpen: true, target: e.currentTarget as HTMLElement, date });
  };

  const openTaskModal = (category: string = '', date?: string) => {
    const validCategory = category || (folders[0]?.name || '');
    const validDate = date || new Date().toISOString().split('T')[0];
    setTaskModal({ isOpen: true, defaultCategory: validCategory, defaultDate: validDate });
  }

  const handleContextMenu = (e: React.MouseEvent, folderId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setNoteContextMenu(null);
    setContextMenu({ x: e.clientX, y: e.clientY, folderId })
  }

  const handleNoteContextMenu = (e: React.MouseEvent, noteId: string, folderId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu(null);
    setNoteContextMenu({ x: e.clientX, y: e.clientY, noteId, folderId })
  }

  const createNewFolder = () => setInputModal({ isOpen: true, mode: 'create_folder' })
  const handleAddNote = (folderId: string) => { setInputModal({ isOpen: true, mode: 'create_note', folderId }); setContextMenu(null) }
  const handleAddCanvas = (folderId: string) => { setInputModal({ isOpen: true, mode: 'create_canvas', folderId }); setContextMenu(null) }

  const openDeleteModal = (folderId: string) => {
    const folder = folders.find(f => f.id === folderId)
    if (folder) setDeleteModal({ isOpen: true, folderId, folderName: folder.name })
  }

  const openRenameModal = (folderId: string) => {
    const folder = folders.find(f => f.id === folderId)
    if (folder) setRenameModal({ isOpen: true, folderId, currentName: folder.name, currentColor: folder.color })
  }

  const toggleCategoryOnDashboard = (folderId: string) => {
    setOpenCategories(prev => ({ ...prev, [folderId]: !(prev[folderId] ?? true) }))
  }

  const deleteTask = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId)
    if (task) setDeleteTaskModal({ isOpen: true, taskId, taskTitle: task.title })
  }

  const calculatePopoverPosition = (target: HTMLElement | null) => {
    if (!target) return {};
    const rect = target.getBoundingClientRect();
    const popoverHeight = 180;
    const popoverWidth = 320;

    let top;
    let left = rect.left;
    const margin = 2;

    if (rect.bottom + margin + popoverHeight <= window.innerHeight) {
      top = rect.bottom + margin;
    } else {
      top = rect.top - popoverHeight - margin;
    }

    if (left + popoverWidth > window.innerWidth) left = window.innerWidth - popoverWidth - 12;
    return { top: Math.max(top, 8), left: Math.max(left, 8) };
  }

  const today = new Date()
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth())
  const [calendarYear, setCalendarYear] = useState(today.getFullYear())
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate()
  const firstDayOfMonth = new Date(calendarYear, calendarMonth, 1).getDay()
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

  const goToPrevYear = () => setCalendarYear(prev => prev - 1);
  const goToNextYear = () => setCalendarYear(prev => prev + 1);
  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => setCalendarMonth(Number(e.target.value));

  const activeFolder = activeNote ? folders.find(f => f.notes.some(n => n.id === activeNote.id)) : null

  const getCoverGradient = (id: string) => {
    const gradients = ['linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)', 'linear-gradient(120deg, #fccb90 0%, #d57eeb 100%)', 'linear-gradient(120deg, #e0c3fc 0%, #8ec5fc 100%)', 'linear-gradient(120deg, #f093fb 0%, #f5576c 100%)']
    // Safe extraction of numbers, falling back to 0 if none
    const numMatch = id.match(/\d+/g);
    const index = numMatch ? parseInt(numMatch.join('')) % gradients.length : 0;
    return gradients[index];
  }

  return (
    <div className="app-container">
      <div className="aurora-bg"></div>

      <aside className={isSidebarOpen ? 'sidebar' : 'sidebar closed'}>
        <div className="user-profile">
          <div className="avatar">P</div>
          <div className="user-info">
            <span className="user-name">Active User</span>
            <span className="user-plan">Private Workspace</span>
          </div>
        </div>

        <ul className="nav-list">
          <li className={"nav-item " + (activeView === 'dashboard' ? 'active' : '')} onClick={() => setActiveView('dashboard')}>
            <PiTelevision style={{ marginRight: '8px', fontSize: '1.1rem' }} /> Dashboard
          </li>

          <li style={{ marginTop: '1rem' }}><button className="btn-add-folder" onClick={createNewFolder}><PiPlus style={{ verticalAlign: 'middle' }} /> New Folder</button></li>
          {folders.map(folder => (
            <li key={folder.id} className="folder-wrapper">
              <div className="folder-header" onContextMenu={(e) => handleContextMenu(e, folder.id)}>
                <span className="folder-arrow" onClick={() => toggleFolderInSidebar(folder.id)}>
                  <PiCaretDown style={{ transform: folder.isOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }} />
                </span>
                <span className="folder-icon" onClick={() => toggleFolderInSidebar(folder.id)}><PiFolder size={18} /></span>
                <span className="folder-name" onClick={() => toggleFolderInSidebar(folder.id)}>{folder.name}</span>
              </div>
              {folder.isOpen && (
                <ul className="folder-content">
                  {folder.notes.map(note => (
                    <li key={note.id} className={"note-item " + (activeNote?.id === note.id ? 'active' : '')} onClick={() => { setActiveNote(note); setActiveView('note') }} onContextMenu={(e) => handleNoteContextMenu(e, note.id, folder.id)}>
                      {note.type === 'canvas' ? <PiSquaresFour style={{ marginRight: '6px' }} /> : <PiNotePencil style={{ marginRight: '6px' }} />} {note.title}
                    </li>
                  ))}
                </ul>)}
            </li>
          ))}
        </ul>

          <div className="pomodoro-widget" style={{ cursor: 'pointer', position: 'relative', zIndex: 1 }} onClick={() => setShowFullscreenTimer(true)}>
            <div className="timer-label"><PiTimer style={{ verticalAlign: 'text-bottom', marginRight: '4px' }} /> Focus Timer</div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
              <CircleProgress
                key={isDark ? 'dark' : 'light'}
                progress={1 - timeLeft / timerDuration}
                size={110}
                strokeWidth={10}
                bgColor={isDark ? '#444' : '#23243a33'}
              >
                <div className="timer-display" style={{ fontSize: 28 }}>{formatTime(timeLeft)}</div>
              </CircleProgress>
            </div>
            <button className="btn-timer" onClick={e => { e.stopPropagation(); setIsTimerRunning(!isTimerRunning); }}>{isTimerRunning ? 'Pause' : 'Start'}</button>
            <button className="btn-timer" onClick={e => { e.stopPropagation(); setIsTimerRunning(false); setTimeLeft(timerDuration) }}>Reset</button>
            <button className="btn-timer" style={{ marginTop: 8 }} onClick={e => { e.stopPropagation(); setShowTimerSetting(true); }}>Set Timer</button>
            <div className="timer-fullscreen-hint">Klik untuk fullscreen</div>
          </div>

        <div className="theme-wrapper">
          <span className="theme-label">Dark Mode</span>
          <button className={`toggle-switch ${isDarkMode ? 'active' : ''}`} onClick={toggleTheme}><div className="toggle-handle">{isDarkMode ? <PiMoon size={12} color="#333" style={{ marginTop: '3px', marginLeft: '3px' }} /> : <PiSun size={12} color="#F59E0B" style={{ marginTop: '3px', marginLeft: '3px' }} />}</div></button>
        </div>
      </aside>

      {showFullscreenTimer && (
        <div className="fullscreen-timer-overlay" onClick={() => setShowFullscreenTimer(false)}>
          <div className="fullscreen-timer-card" onClick={e => e.stopPropagation()}>
            <button className="fullscreen-timer-exit" onClick={() => setShowFullscreenTimer(false)} title="Keluar fullscreen">&times;</button>
            <div className="fullscreen-timer-label"><PiTimer style={{ verticalAlign: 'text-bottom', marginRight: '8px', fontSize: '2rem' }} /> Focus Timer</div>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', marginBottom: '2.2rem', width: 260, height: 260, marginLeft: 'auto', marginRight: 'auto' }}>
              <CircleProgress
                key={isDark ? 'dark' : 'light'}
                progress={1 - timeLeft / timerDuration}
                size={240}
                strokeWidth={14}
                bgColor={isDark ? '#444' : '#23243a33'}
              >
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', fontSize: 64, fontWeight: 800,
                  color: 'var(--accent, #f59e0b)', textShadow: '0 0 40px var(--accent-glow, #fbbf24)'
                }}>
                  {formatTime(timeLeft)}
                </div>
              </CircleProgress>
            </div>
            <div className="fullscreen-timer-controls">
              <button className="btn-timer fullscreen" onClick={() => setIsTimerRunning(!isTimerRunning)}>{isTimerRunning ? 'Pause' : 'Start'}</button>
              <button className="btn-timer fullscreen" onClick={() => { setIsTimerRunning(false); setTimeLeft(timerDuration) }}>Reset</button>
              <button className="btn-timer fullscreen" onClick={() => setShowTimerSetting(true)}>Set Timer</button>
            </div>
          </div>
        </div>
      )}

      {showTimerSetting && (
        <div className="fullscreen-timer-overlay" onClick={() => setShowTimerSetting(false)}>
          <div className="fullscreen-timer-card" onClick={e => e.stopPropagation()} style={{ minWidth: 320, minHeight: 0, padding: '2.5rem 2rem' }}>
            <div className="fullscreen-timer-label">Set Timer Duration</div>
            <form style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'center' }} onSubmit={e => {
              e.preventDefault();
              const form = e.target as HTMLFormElement;
              const min = Number((form.elements.namedItem('minutes') as HTMLInputElement).value);
              if (min > 0 && min <= 180) {
                setTimerDuration(min * 60);
                setTimeLeft(min * 60);
                setShowTimerSetting(false);
              }
            }}>
              <input name="minutes" type="number" min={1} max={180} defaultValue={Math.round(timerDuration/60)} className="goals-input" style={{ width: 120, textAlign: 'center', fontSize: 22 }} />
              <button className="btn-timer fullscreen" type="submit">Set</button>
            </form>
          </div>
        </div>
      )}

      <main className="editor-area">
        <header className="editor-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {!isSidebarOpen && <button className="btn-graph" onClick={toggleSidebar}><PiList /></button>}
            <span className="breadcrumb">
              {activeView === 'dashboard' ? 'Dashboard' : (
                <>
                  <span style={{ opacity: 0.6 }}>{activeFolder?.name || 'Folder'}</span> <span style={{ margin: '0 6px', opacity: 0.4 }}>/</span> <span>{activeNote?.title}</span>
                </>
              )}
            </span>
          </div>
        </header>

        {activeView === 'dashboard' ? (
          <div className="dashboard-view">
            <div className="dashboard-title">
              <h1>Tasks & Deadlines</h1>
            </div>

            <div className="goals-section">
              <div className="goals-header">
                <span className={goalMode === 'daily' ? 'goals-mode active' : 'goals-mode'} onClick={() => setGoalMode('daily')}>Daily</span>
                <span className={goalMode === 'weekly' ? 'goals-mode active' : 'goals-mode'} onClick={() => setGoalMode('weekly')}>Weekly</span>
                <span style={{ flex: 1 }} />
                <span className="goals-progress-label">Progress: {progress}%</span>
              </div>
              <div className="goals-progress-bar-bg">
                <div className="goals-progress-bar" style={{ width: progress + '%' }} />
              </div>
              <form className="goals-add-form" onSubmit={handleAddGoal}>
                <input className="goals-input" placeholder={goalMode === 'daily' ? 'Add daily goal...' : 'Add weekly goal...'} value={goalInput} onChange={e => setGoalInput(e.target.value)} />
                <button className="goals-add-btn" type="submit">Add</button>
              </form>
              <ul className="goals-list">
                {filteredGoals.length === 0 && <li className="goals-empty">No goals yet.</li>}
                {filteredGoals.map((g) => (
                  <li key={g.id} className={g.done ? 'goals-item done' : 'goals-item'} onClick={() => toggleGoalDone(g.id, g.done)}>
                    <span className="goals-check">{g.done ? '✔' : ''}</span>
                    <span className="goals-text">{g.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="view-tabs">
              <button className={`view-tab ${dashboardTab === 'category' ? 'active' : ''}`} onClick={() => setDashboardTab('category')}><PiStack style={{ verticalAlign: 'text-bottom' }} /> By Category</button>
              <button className={`view-tab ${dashboardTab === 'calendar' ? 'active' : ''}`} onClick={() => setDashboardTab('calendar')}><PiCalendar style={{ verticalAlign: 'text-bottom' }} /> Calendar</button>
            </div>

            {dashboardTab === 'category' && (
              <DragDropContext onDragEnd={onDragEnd}>
                <div className="category-views">
                  {folders.map(folder => {
                    const folderTasks = tasks.filter(t => t.category === folder.name);
                    const isCategoryOpen = openCategories[folder.id] ?? true;
                    return (
                      <div key={folder.id} className="category-group">
                        <div className="category-header" onClick={() => toggleCategoryOnDashboard(folder.id)} style={{ cursor: 'pointer' }}>
                          <span style={{ fontSize: '0.8rem', transition: 'transform 0.2s', transform: isCategoryOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}>▼</span>
                          <span className="category-pill">{folder.name}</span>
                        </div>
                        {isCategoryOpen && (
                          <StrictModeDroppable droppableId={folder.id}>
                            {(provided) => (
                              <div ref={provided.innerRef} {...provided.droppableProps}>
                                <div className="task-list-header">
                                  <span>Meeting / Task Name</span>
                                  <span>Date</span>
                                </div>
                                {folderTasks.map((task, index) => (
                                  <Draggable key={task.id} draggableId={task.id} index={index}>
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className={`task-row ${task.status === 'Done' ? 'completed' : ''} ${snapshot.isDragging ? 'dragging' : ''}`}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                                          <input type="checkbox" className="custom-checkbox" checked={task.status === 'Done'} onChange={() => toggleTaskStatus(task.id, task.status)} />
                                          <span className="task-title" title={task.title}>{task.title}</span>
                                        </div>
                                        <span className="task-date" style={{ marginRight: '1rem' }}>{new Date(task.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                        <button onClick={() => deleteTask(task.id)} className="btn-icon-danger"><PiTrash /></button>
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                                <button className="btn-inline-add" onClick={(e) => { e.stopPropagation(); openTaskModal(folder.name, ''); }}>
                                  <PiPlus style={{ marginRight: '4px' }} /> New Task
                                </button>
                              </div>
                            )}
                          </StrictModeDroppable>
                        )}
                      </div>
                    );
                  })}
                  <button className="btn-inline-add" style={{ marginTop: '2rem' }} onClick={createNewFolder}>
                    <PiPlus style={{ marginRight: '4px' }} /> Add new category
                  </button>
                </div>
              </DragDropContext>
            )}

            {dashboardTab === 'calendar' && (
              <div className="calendar-views">
                <div className="calendar-nav-bar">
                  <button className="btn-timer" onClick={() => setCalendarYear(y => y - 1)}>&lt;&lt;</button>
                  <button className="btn-timer" onClick={() => setCalendarMonth(m => m === 0 ? 11 : m - 1)}>&lt;</button>
                  <span className="calendar-month-label">{monthNames[calendarMonth]}</span>
                  <span className="calendar-year-label">{calendarYear}</span>
                  <button className="btn-timer" onClick={() => setCalendarMonth(m => m === 11 ? 0 : m + 1)}>&gt;</button>
                  <button className="btn-timer" onClick={() => setCalendarYear(y => y + 1)}>&gt;&gt;</button>
                </div>
                <div className="calendar-header-row">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
                </div>
                <div className="calendar-grid">
                  {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} className="cal-day empty"></div>)}
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                    const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                    const dayTasks = tasks.filter(t => t.date === dateStr)
                    const isToday = day === today.getDate() && calendarMonth === today.getMonth() && calendarYear === today.getFullYear();

                    const onDropEvent = async (e: React.DragEvent<HTMLDivElement>) => {
                      e.preventDefault();
                      const taskId = e.dataTransfer.getData('text/event-id');
                      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, date: dateStr } : t));
                      await supabase.from('tasks').update({ date: dateStr }).eq('id', taskId);
                    };
                    const onDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();

                    const isImportant = dayTasks.some(t => /urgent|penting/i.test(t.title));
                    return (
                      <div
                        key={day}
                        className={`cal-day ${isToday ? 'today' : ''} ${isImportant ? 'important-day' : ''}`}
                        onClick={e => openEventPopover(e, dateStr)}
                        style={{ position: 'relative', cursor: 'pointer' }}
                        onDrop={onDropEvent}
                        onDragOver={onDragOver}
                      >
                        <div className="day-header">
                          <span className="day-num">{day}</span>
                          {dayTasks.length > 0 && (
                            <span className="event-count-badge">{dayTasks.length}</span>
                          )}
                        </div>
                        {dayTasks.slice(0, 4).map((t: Task) => {
                          const folderColor = folders.find(f => f.name === t.category)?.color || '#6366f1';
                          return (
                            <div
                              key={t.id}
                              className="event-badge"
                              draggable
                              onDragStart={e => e.dataTransfer.setData('text/event-id', t.id)}
                              style={{ background: folderColor, color: '#fff' }}
                              title={t.title}
                            >
                              {t.title}
                            </div>
                          );
                        })}
                        {dayTasks.length > 4 && <div className="event-badge more-badge">+{dayTasks.length - 4} more</div>}
                      </div>
                    )
                  })}

                  {eventPopover.isOpen && (
                    <div className="modal-overlay transparent" onClick={closeEventPopover}>
                      <div className="event-popover" style={calculatePopoverPosition(eventPopover.target)} onClick={e => e.stopPropagation()}>
                        <h4 className="quick-add-title">Tasks on {new Date(eventPopover.date).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</h4>
                        <div style={{ marginBottom: 8 }}>
                          {tasks.filter(t => t.date === eventPopover.date).length === 0 && <div style={{ color: '#888', fontSize: 14 }}>No tasks</div>}
                          {tasks.filter(t => t.date === eventPopover.date).map(task => (
                            <div key={task.id} className="event-card">
                              <div className="event-card-header">
                                <span className="event-card-title" title={task.title}>{task.title}</span>
                                <button className="event-card-edit" title="Edit" onClick={() => { setEditEventModal({ isOpen: true, event: task }); closeEventPopover(); }}>
                                  <PiPencilSimple style={{ marginRight: 6 }} /> Edit
                                </button>
                                <button className="event-card-open" title="Open" onClick={() => { setOpenEventDetail({ isOpen: true, event: task }); closeEventPopover(); }}>
                                  <PiNotePencil style={{ marginRight: 6 }} /> Details
                                </button>
                                <button className="event-card-delete" title="Delete" onClick={() => { setDeleteTaskModal({ isOpen: true, taskId: task.id, taskTitle: task.title }); closeEventPopover(); }}>
                                  <PiTrash style={{ marginRight: 6 }} /> Delete
                                </button>
                              </div>
                              <div className="event-card-meta">
                                <span className="event-card-category">Category: {task.category}</span>
                                <span className="event-card-status">Status: {task.status}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <button className="btn-inline-add" onClick={() => { openQuickAdd({ currentTarget: eventPopover.target } as any, eventPopover.date); closeEventPopover(); }}>
                          <PiPlus style={{ marginRight: 4 }} />Add Event
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="document-container">
            <div className="document-cover" style={{ background: getCoverGradient(activeNote?.id || '0') }}>
              <div className="cover-actions">
                <button className="btn-cover-action"><PiImage style={{ marginRight: '6px' }} /> Change Cover</button>
              </div>
            </div>

            <article className="document-content">
              <div className="document-icon-wrapper">
                <span className="document-icon-large">{activeNote?.type === 'canvas' ? <PiSquaresFour /> : <PiNotePencil />}</span>
                <button className="btn-icon-action"><PiSmiley /></button>
              </div>

              <input className="document-title-input" value={activeNote?.title || ''} onChange={onNoteTitleChange} placeholder="Untitled" />

              <div className="document-meta">
                <span className="meta-item"><PiCalendar style={{ marginRight: '4px' }} /> Today</span>
                <span className="meta-item"><PiTag style={{ marginRight: '4px' }} /> Add Tag</span>
              </div>

              <div className="editor-wrapper">
                {activeNote?.type === 'canvas' ? (
                  <div className="canvas-placeholder"><PiSquaresFour size={48} /><h3>Canvas Mode</h3><p>Draw diagrams and create visuals here.</p></div>
                ) : (
                  /* 3. Gunakan Komponen Editor Pintar yang Bisa Load/Save Content */
                  <EditorWrapper key={activeNote?.id} note={activeNote!} isDarkMode={isDarkMode} />
                )}
              </div>
            </article>
          </div>
        )}
      </main>

      {/* --- ALL MODALS --- */}
      {quickAddPopover.isOpen && (
        <div className="modal-overlay transparent" onClick={() => setQuickAddPopover({ isOpen: false, target: null, date: '' })}>
          <div className="quick-add-popover" style={calculatePopoverPosition(quickAddPopover.target)} onClick={e => e.stopPropagation()}>
            <h4 className="quick-add-title">Quick Add Task</h4>
            <form onSubmit={handleQuickAddSubmit}>
              <input name="title" className="form-control" placeholder="Example: Finish report" autoFocus required />
              <div className="select-wrapper">
                <select name="category" className="form-control" defaultValue={activeFolder?.name || (folders[0]?.name || '')}>
                  {folders.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                </select>
                <PiCaretDown className="select-icon" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setQuickAddPopover({ isOpen: false, target: null, date: '' })}>Cancel</button>
                <button type="submit" className="btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editEventModal.isOpen && editEventModal.event && (
        <div className="modal-overlay" onClick={() => setEditEventModal({ isOpen: false, event: null })}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Edit Event</h3>
            <form onSubmit={handleEditEventSubmit}>
              <div className="form-group">
                <label>Title</label>
                <input name="title" className="form-control" defaultValue={editEventModal.event.title} required />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select name="category" className="form-control" defaultValue={editEventModal.event.category}>
                  {folders.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Date</label>
                <DatePicker
                  selected={new Date(editEventModal.event.date)}
                  onChange={(date: Date | null) => {
                    if (date) {
                      setEditEventModal(prev => ({
                        ...prev,
                        event: prev.event ? { ...prev.event, date: date.toISOString().split('T')[0] } : null
                      }));
                    }
                  }}
                  dateFormat="yyyy-MM-dd"
                  customInput={<CustomDateInput />}
                />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select name="status" className="form-control" defaultValue={editEventModal.event.status}>
                  <option value="To Do">To Do</option>
                  <option value="Done">Done</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setEditEventModal({ isOpen: false, event: null })}>Cancel</button>
                <button type="submit" className="btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {openEventDetail.isOpen && openEventDetail.event && (
        <div className="modal-overlay" onClick={() => setOpenEventDetail({ isOpen: false, event: null })}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Event Details</h3>
            <div className="event-detail-card">
              <div style={{ fontWeight: 700, fontSize: '1.2rem', marginBottom: 8 }} title={openEventDetail.event.title}>{openEventDetail.event.title}</div>
              <div style={{ color: 'var(--text-secondary)', marginBottom: 8 }}>
                Category: {openEventDetail.event.category} | Date: {openEventDetail.event.date} | Status: {openEventDetail.event.status}
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  className="form-control"
                  rows={5}
                  placeholder="Write notes..."
                  value={eventNotes[openEventDetail.event.id] || ''}
                  onChange={e => {
                    const val = e.target.value;
                    setEventNotes(prev => ({ ...prev, [openEventDetail.event!.id]: val }));
                  }}
                />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>Autosaved</span>
              </div>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setOpenEventDetail({ isOpen: false, event: null })}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {contextMenu && (
        <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }} onClick={(e) => e.stopPropagation()}>
          <div className="context-item" onClick={() => handleAddNote(contextMenu.folderId)}>
            <PiFilePlus style={{ marginRight: '8px' }} /> Add Note
          </div>
          <div className="context-item" onClick={() => handleAddCanvas(contextMenu.folderId)}>
            <PiSquaresFour style={{ marginRight: '8px' }} /> Add Canvas
          </div>
          <div className="context-item" onClick={() => openRenameModal(contextMenu.folderId)}>
            <PiPencilSimple style={{ marginRight: '8px' }} /> Edit
          </div>
          <div className="context-item delete" onClick={() => openDeleteModal(contextMenu.folderId)}>
            <PiTrash style={{ marginRight: '8px' }} /> Delete
          </div>
        </div>
      )}

      {noteContextMenu && (
        <div className="context-menu" style={{ top: noteContextMenu.y, left: noteContextMenu.x }} onClick={(e) => e.stopPropagation()}>
          <div className="context-item" onClick={() => setRenameNoteModal({ isOpen: true, folderId: noteContextMenu.folderId, noteId: noteContextMenu.noteId, currentTitle: folders.find(f => f.id === noteContextMenu.folderId)?.notes.find(n => n.id === noteContextMenu.noteId)?.title || '' })}>
            <PiPencilSimple style={{ marginRight: '8px' }} /> Rename
          </div>
          <div className="context-item delete" onClick={() => setDeleteNoteModal({ isOpen: true, folderId: noteContextMenu.folderId, noteId: noteContextMenu.noteId, noteTitle: folders.find(f => f.id === noteContextMenu.folderId)?.notes.find(n => n.id === noteContextMenu.noteId)?.title || '' })}>
            <PiTrash style={{ marginRight: '8px' }} /> Delete
          </div>
        </div>
      )}

      {renameModal.isOpen && (
        <div className="modal-overlay" onClick={() => setRenameModal({ isOpen: false, folderId: '', currentName: '', currentColor: '' })}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Edit Folder</h3>
            <form onSubmit={handleRenameFolder}>
              <div className="form-group">
                <label>Folder Name</label>
                <input name="newName" className="form-control" autoFocus required defaultValue={renameModal.currentName} />
              </div>
              <div className="form-group">
                <label>Folder Color</label>
                <input name="folderColor" type="color" className="form-control" defaultValue={renameModal.currentColor} style={{ width: 48, height: 32, padding: 0, border: 'none', background: 'none' }} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setRenameModal({ isOpen: false, folderId: '', currentName: '', currentColor: '' })}>Cancel</button>
                <button type="submit" className="btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {renameNoteModal.isOpen && (
        <div className="modal-overlay" onClick={() => setRenameNoteModal({ isOpen: false, folderId: '', noteId: '', currentTitle: '' })}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Edit Note</h3>
            <form onSubmit={handleRenameNoteSubmit}>
              <div className="form-group">
                <label>Note Name</label>
                <input name="newNoteTitle" className="form-control" autoFocus required defaultValue={renameNoteModal.currentTitle} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setRenameNoteModal({ isOpen: false, folderId: '', noteId: '', currentTitle: '' })}>Cancel</button>
                <button type="submit" className="btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteModal.isOpen && (
        <div className="modal-overlay" onClick={() => setDeleteModal({ isOpen: false, folderId: '', folderName: '' })}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Delete Folder?</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Are you sure you want to delete the folder <strong>{deleteModal.folderName}</strong>? <br />
              All tasks and notes within it will be permanently deleted.
            </p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setDeleteModal({ isOpen: false, folderId: '', folderName: '' })}>Cancel</button>
              <button className="btn-danger" onClick={confirmDeleteFolder}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {deleteNoteModal.isOpen && (
        <div className="modal-overlay" onClick={() => setDeleteNoteModal({ isOpen: false, folderId: '', noteId: '', noteTitle: '' })}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Delete Note?</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Are you sure you want to delete the note <strong>{deleteNoteModal.noteTitle}</strong>? <br />
              This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setDeleteNoteModal({ isOpen: false, folderId: '', noteId: '', noteTitle: '' })}>Cancel</button>
              <button className="btn-danger" onClick={confirmDeleteNote}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {deleteTaskModal.isOpen && (
        <div className="modal-overlay" onClick={() => setDeleteTaskModal({ isOpen: false, taskId: '', taskTitle: '' })}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Delete Task?</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Are you sure you want to delete the task <strong>{deleteTaskModal.taskTitle}</strong>?
            </p>
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setDeleteTaskModal({ isOpen: false, taskId: '', taskTitle: '' })}>Cancel</button>
              <button className="btn-danger" onClick={confirmDeleteTask}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {inputModal.isOpen && (
        <div className="modal-overlay" onClick={() => setInputModal({ ...inputModal, isOpen: false })}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>
              {inputModal.mode === 'create_folder' ? 'New Folder' : inputModal.mode === 'create_note' ? 'New Note' : 'New Canvas'}
            </h3>
            <form onSubmit={handleInputSubmit}>
              <div className="form-group">
                <label>Name</label>
                <input name="inputValue" className="form-control" autoFocus required placeholder={inputModal.mode === 'create_folder' ? 'Folder Name...' : 'Title...'} />
              </div>
              {inputModal.mode === 'create_folder' && (
                <div className="form-group">
                  <label>Folder Color</label>
                  <input name="inputColor" type="color" className="form-control" defaultValue="#6366f1" style={{ width: 48, height: 32, padding: 0, border: 'none', background: 'none' }} />
                </div>
              )}
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setInputModal({ ...inputModal, isOpen: false })}>Cancel</button>
                <button type="submit" className="btn-primary">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {taskModal.isOpen && (
        <div className="modal-overlay" onClick={() => setTaskModal({ ...taskModal, isOpen: false })}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Add New Task</h3>
            <form onSubmit={handleTaskSubmit}>
              <div className="form-group">
                <label>Task Name</label>
                <input name="title" className="form-control" autoFocus required placeholder="Example: Thesis Chapter 2" />
              </div>
              <div className="form-group">
                <label>Category</label>
                <div className="select-wrapper">
                  <select name="category" className="form-control" defaultValue={taskModal.defaultCategory || (folders[0]?.name || '')}>
                    {folders.length === 0 ? <option value="">No categories</option> : folders.map(f => <option key={f.id} value={f.name}>{f.name}</option>)}
                  </select>
                  <PiCaretDown className="select-icon" />
                </div>
              </div>
              <div className="form-group">
                <label>Date</label>
                <DatePicker
                  selected={new Date(taskModal.defaultDate)}
                  onChange={(date: Date | null) => {
                    if (date) {
                      setTaskModal(prev => ({ ...prev, defaultDate: date.toISOString().split('T')[0] }));
                    }
                  }}
                  dateFormat="yyyy-MM-dd"
                  customInput={<CustomDateInput />}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setTaskModal({ ...taskModal, isOpen: false })}>Cancel</button>
                <button type="submit" className="btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            <span className="toast-icon">
              {toast.type === 'success' ? <PiCheckCircle size={28} color="#22c55e" /> : <PiWarningCircle size={28} color="#ef4444" />}
            </span>
            <span>{toast.message}</span>
            <button className="toast-close" onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}><PiX /></button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App