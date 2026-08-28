import React, { useState, useEffect, useCallback, useRef } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { useAuth } from "../context/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import { Loader } from "../components/ui/Loader";
import { Plus, Edit, Trash2, Clock, CheckCircle, Circle, AlertCircle } from "lucide-react";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";
import type { Task, User } from "../types";
import { format } from "date-fns";
import { el } from "date-fns/locale";

type Value = Date | null;
type CalendarValue = Value | [Value, Value];

interface InspectionEvent {
  id: string;
  customerID: string;
  customerName: string;
  extinguisherID: string;
  storeID: string;
  storeName: string;
  recheckDate: string;
  type: string;
}

export const ProjectCalendar: React.FC = () => {
  const { userProfile, role, user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewDate, setViewDate] = useState<Date>(new Date()); // Νέο state για navigation
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [inspections, setInspections] = useState<InspectionEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showAddForm && formRef.current && window.innerWidth < 1024) {
      const timer = setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showAddForm, editingTask]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    time: "09:00",
    assignedTo: "OFFICE" as "OFFICE" | "DELIVERY" | "ALL" | "USER",
    assignedUserId: "",
  });

  const [users, setUsers] = useState<User[]>([]);
  const monthKey = `${selectedDate.getFullYear()}-${selectedDate.getMonth()}`;

  const compareTasks = useCallback((a: Task, b: Task) => {
    const dateCompare = (a.date || "").localeCompare(b.date || "");
    if (dateCompare !== 0) return dateCompare;
    return (a.time || "").localeCompare(b.time || "");
  }, []);

  // Converts dd-MM-yyyy to yyyy-MM-dd, passes yyyy-MM-dd through unchanged
  const normalizeDate = (dateStr: string): string => {
    if (!dateStr) return dateStr;
    // Already yyyy-MM-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    // Old format dd-MM-yyyy → yyyy-MM-dd
    const match = dateStr.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (match) return `${match[3]}-${match[2]}-${match[1]}`;
    return dateStr;
  };

  const toIsoString = (value: any, fallback: string): string => {
    if (!value) return fallback;
    if (typeof value === "string") return value;
    if (value instanceof Date) return value.toISOString();
    if (value && typeof value.toDate === "function") {
      try {
        return value.toDate().toISOString();
      } catch {
        return fallback;
      }
    }
    return fallback;
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snapshot = await getDocs(collection(db, "users_roles"));
        const userList = snapshot.docs.map((doc) => {
          const data = doc.data() as User;
          return {
            ...data,
            uid: data.uid || doc.id,
          };
        });
        setUsers(userList);
      } catch (error) {
        console.error("Error loading users:", error);
      }
    };

    fetchUsers();
  }, []);

  const shouldIncludeTask = useCallback((task: Task): boolean => {
    if (role === "admin" || role === "developer") return true;
    if (!role || !userProfile) return false;

    const assignment = task.assignedTo || "ALL";
    const normalizedUserEmail = (userProfile.email || "").toLowerCase();
    const taskUserEmail = (task.assignedUserEmail || task.employee || "").toLowerCase();
    const assignedUserId = task.assignedUserId || null;
    const employeeRole = task.employee_role ? task.employee_role.toLowerCase() : null;

    if (assignment === "ALL") return true;
    if (assignment === "USER") {
      if (assignedUserId && assignedUserId === userProfile.uid) return true;
      if (taskUserEmail && normalizedUserEmail && taskUserEmail === normalizedUserEmail) return true;
      return false;
    }
    if (assignment === "OFFICE") return role === "office";
    if (assignment === "DELIVERY") return role === "delivery";

    if (employeeRole && employeeRole === role) return true;
    if (taskUserEmail && normalizedUserEmail && taskUserEmail === normalizedUserEmail) return true;

    return false;
  }, [role, userProfile]);

  const fetchTasksForMonth = useCallback(async (): Promise<Task[]> => {
    if (!monthKey || role === null) return [];

    const [yearStr, monthStr] = monthKey.split("-");
    const year = Number(yearStr);
    const monthIndex = Number(monthStr);

    if (Number.isNaN(year) || Number.isNaN(monthIndex)) return [];

    const startOfMonth = new Date(year, monthIndex, 1);
    const endOfMonth = new Date(year, monthIndex + 1, 0);

    const startDateStr = format(startOfMonth, "yyyy-MM-dd");
    const endDateStr = format(endOfMonth, "yyyy-MM-dd");

    // Fetch ALL tasks to handle both old dd-MM-yyyy and new yyyy-MM-dd formats
    const snapshot = await getDocs(collection(db, "tasks"));
    const tasksData = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: normalizeDate(data.date),
      };
    }) as Task[];

    // Filter by month range client-side (works correctly with yyyy-MM-dd)
    const monthTasks = tasksData.filter(
      (task) => task.date >= startDateStr && task.date <= endDateStr
    );

    const filteredTasks = monthTasks.filter(shouldIncludeTask);
    filteredTasks.sort(compareTasks);

    return filteredTasks;
  }, [compareTasks, monthKey, role, shouldIncludeTask]);

  const resolveUserIdFromTask = (task: Task): string => {
    if (task.assignedUserId) return task.assignedUserId;
    const targetEmail = (task.assignedUserEmail || task.employee || "").toLowerCase();
    if (!targetEmail) return "";

    const matchingUser = users.find((user) => (user.email || "").toLowerCase() === targetEmail);
    return matchingUser ? matchingUser.uid : "";
  };

  // Load all tasks for the month (inspections disabled)
  useEffect(() => {
    let isActive = true;
    setInspections([]);

    const load = async () => {
      setLoading(true);
      try {
        const tasks = await fetchTasksForMonth();
        if (!isActive) return;
        setAllTasks(tasks);
      } catch (error) {
        if (isActive) {
          console.error("Error loading tasks:", error);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      isActive = false;
    };
  }, [fetchTasksForMonth]);

  const handleDateChange = (value: CalendarValue) => {
    if (value instanceof Date) {
      setSelectedDate(value);
      setViewDate(value); // Ενημέρωσε και το view
      setShowAddForm(false);
      setEditingTask(null);
    }
  };

  const getTasksForDate = (date: Date): Task[] => {
    const dateStr = format(date, "yyyy-MM-dd");
    return allTasks.filter(task => task.date === dateStr);
  };

  const getInspectionsForDate = (date: Date): InspectionEvent[] => {
    const dateStr = format(date, "yyyy-MM-dd");
    return inspections.filter(insp => {
      const inspDate = format(new Date(insp.recheckDate), "yyyy-MM-dd");
      return inspDate === dateStr;
    });
  };

  const tileContent = ({ date, view }: any) => {
    if (view === 'month') {
      const tasksForDate = getTasksForDate(date);
      const inspectionsForDate = getInspectionsForDate(date);
      const totalEvents = tasksForDate.length + inspectionsForDate.length;

      if (totalEvents === 0) return null;

      const maxToShow = 3;
      const allEvents = [
        ...tasksForDate.map(task => ({ type: 'task', data: task })),
        ...inspectionsForDate.map(insp => ({ type: 'inspection', data: insp }))
      ];

      // Ελέγχουμε αν η ημερομηνία είναι η επιλεγμένη
      const isSelectedDate = format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');

      return (
        <div className="task-list">
          {allEvents.slice(0, maxToShow).map((event, idx) => {
            const taskColor = event.type === 'task'
              ? getTaskColor(event.data as Task)
              : '#9333ea';

            return (
              <div
                key={`${event.type}-${idx}`}
                className="task-item"
                style={{
                  borderLeftColor: taskColor,
                  backgroundColor: `${taskColor}15`
                }}
              >
                <span className="task-time">
                  {event.type === 'task' ? (event.data as Task).time : ''}
                </span>
                <span className="task-title">
                  {event.type === 'task'
                    ? (event.data as Task).title
                    : `Έλεγχος: ${(event.data as InspectionEvent).customerName}`
                  }
                </span>
              </div>
            );
          })}
          {totalEvents > maxToShow && (
            <div
              className="task-more"
              style={{
                color: isSelectedDate ? 'white' : '#2563eb'
              }}
            >
              +{totalEvents - maxToShow} ακόμη
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const getTaskColor = (task: Task): string => {
    switch (task.assignedTo) {
      case 'OFFICE': return '#3b82f6';      // Μπλε
      case 'DELIVERY': return '#10b981';    // Πράσινο
      case 'ALL': return '#f59e0b';         // Πορτοκαλί
      case 'USER': return '#8b5cf6';        // Μωβ
      default: return '#6b7280';            // Γκρι
    }
  };

  const getAssignmentLabel = (task: Task): string => {
    if (task.assignedTo === 'USER') {
      return task.assignedUserName || task.assignedUserEmail || task.employee || 'USER';
    }
    if (task.assignedTo === 'OFFICE') return 'OFFICE';
    if (task.assignedTo === 'DELIVERY') return 'DELIVERY';
    if (task.assignedTo === 'ALL') return 'ALL';
    if (task.employee_role) return task.employee_role.toUpperCase();
    return 'ΕΡΓΑΣΙΑ';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile || !selectedDate) return;

    if (formData.assignedTo === "USER" && !formData.assignedUserId) {
      alert("Επιλέξτε τον χρήστη στον οποίο θα ανατεθεί η εργασία.");
      return;
    }

    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const taskId = editingTask?.id || `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const selectedUser = formData.assignedTo === "USER"
        ? users.find((user) => user.uid === formData.assignedUserId)
        : null;

      const fullName = selectedUser
        ? [selectedUser.firstname, selectedUser.lastname].filter(Boolean).join(" ").trim()
        : "";
      const assignment = formData.assignedTo === "USER" ? "USER" : formData.assignedTo;

      const existingAssignedUserId =
        assignment === "USER" && editingTask ? resolveUserIdFromTask(editingTask) : "";
      const finalAssignedUserId =
        assignment === "USER"
          ? formData.assignedUserId || existingAssignedUserId
          : null;
      const finalAssignedUserEmail =
        assignment === "USER"
          ? selectedUser?.email ?? editingTask?.assignedUserEmail ?? editingTask?.employee ?? null
          : null;
      const finalAssignedUserName =
        assignment === "USER"
          ? selectedUser
            ? fullName || selectedUser.email || null
            : editingTask?.assignedUserName || editingTask?.employee || null
          : null;
      const finalAssignedUserRole =
        assignment === "USER"
          ? selectedUser?.role ?? editingTask?.employee_role ?? null
          : null;

      if (assignment === "USER" && (!finalAssignedUserId || !finalAssignedUserEmail)) {
        alert("Ο επιλεγμένος χρήστης δεν βρέθηκε. Παρακαλώ επιλέξτε ξανά.");
        return;
      }

      const creatorId = userProfile?.uid || user?.uid || null;
      if (!creatorId) {
        alert("Δεν βρέθηκε αναγνωριστικό χρήστη. Παρακαλώ κάντε επανασύνδεση.");
        return;
      }

      setLoading(true);

      const taskData: any = {
        date: dateStr,
        time: formData.time,
        title: formData.title,
        description: formData.description,
        assignedTo: assignment,
        assignedUserId: finalAssignedUserId || null,
        assignedUserEmail: finalAssignedUserEmail || null,
        assignedUserName: finalAssignedUserName || null,
        employee: finalAssignedUserEmail || null,
        employee_role: finalAssignedUserRole || null,
        createdBy: creatorId,
        completed: editingTask?.completed || false,
        createdAt: editingTask?.createdAt || serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, "tasks", taskId), taskData);

      const nowIso = new Date().toISOString();
      const localCreatedAt = editingTask
        ? toIsoString(editingTask.createdAt, nowIso)
        : nowIso;

      const localTask: Task = {
        id: taskId,
        date: taskData.date,
        time: taskData.time,
        title: taskData.title,
        description: taskData.description,
        assignedTo: assignment,
        assignedUserId: finalAssignedUserId || null,
        assignedUserEmail: finalAssignedUserEmail || null,
        assignedUserName: finalAssignedUserName || null,
        employee: finalAssignedUserEmail || null,
        employee_role: finalAssignedUserRole || null,
        createdBy: creatorId,
        completed: taskData.completed,
        createdAt: localCreatedAt,
        updatedAt: nowIso,
      };

      setAllTasks((prev) => {
        const filtered = prev.filter((task) => task.id !== taskId);
        if (shouldIncludeTask(localTask)) {
          filtered.push(localTask);
        }
        filtered.sort(compareTasks);
        return filtered;
      });

      // Reset form
      setFormData({
        title: "",
        description: "",
        time: "09:00",
        assignedTo: "OFFICE",
        assignedUserId: "",
      });
      setShowAddForm(false);
      setEditingTask(null);
    } catch (error) {
      console.error("Error saving task:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    const hasExplicitUser = task.assignedTo === "USER" || !!task.assignedUserId;
    const fallbackUser = !task.assignedTo && !!(task.assignedUserEmail || task.employee);
    const assignmentValue = hasExplicitUser || fallbackUser ? "USER" : (task.assignedTo || "OFFICE");
    const resolvedUserId = hasExplicitUser || fallbackUser ? resolveUserIdFromTask(task) : "";

    setFormData({
      title: task.title,
      description: task.description || "",
      time: task.time,
      assignedTo: assignmentValue,
      assignedUserId: resolvedUserId,
    });
    setShowAddForm(true);
  };

  const handleDelete = async (taskId: string) => {
    if (!confirm("Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την εργασία;")) return;

    try {
      setLoading(true);
      await deleteDoc(doc(db, "tasks", taskId));
      setAllTasks((prev) => prev.filter((task) => task.id !== taskId));
    } catch (error) {
      console.error("Error deleting task:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleComplete = async (task: Task) => {
    if (!task.id) return;

    try {
      setLoading(true);
      await setDoc(doc(db, "tasks", task.id), {
        ...task,
        completed: !task.completed,
        updatedAt: serverTimestamp(),
      });
      const nowIso = new Date().toISOString();
      const updatedTask: Task = {
        ...task,
        completed: !task.completed,
        updatedAt: nowIso,
      };

      setAllTasks((prev) => {
        const updatedList = prev.map((item) => (item.id === task.id ? updatedTask : item));
        updatedList.sort(compareTasks);
        return updatedList;
      });
    } catch (error) {
      console.error("Error updating task:", error);
    } finally {
      setLoading(false);
    }
  };

  const selectedDateTasks = getTasksForDate(selectedDate);
  const selectedDateInspections = getInspectionsForDate(selectedDate);
  const canManageTasks = role && ['admin', 'developer', 'office'].includes(role);

  return (
    <div className="min-h-screen py-4" style={{ backgroundColor: 'var(--background)' }}>
      <div className="space-y-4 ">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar - Much Larger */}
          <div className="lg:col-span-2">
            <Card style={{ borderColor: 'var(--border)' }}>
              <CardContent className="p-2">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <h1 className="text-3xl font-bold" style={{ color: 'var(--primary-gray)' }}>
                    Ημερολόγιο Εργασιών
                  </h1>
                  <div className="flex items-center gap-2" style={{justifyContent: 'space-between', width: '100%'}}>
                    {canManageTasks && (
                      <Button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Νέα Εργασία
                      </Button>
                    )}
                    <Button
                      onClick={() => {
                        const today = new Date();
                        setSelectedDate(today);
                        setViewDate(today);
                      }}
                      variant="outline"
                      className="text-sm border-blue-600 text-blue-600 hover:bg-blue-50"
                      id="today-button"
                    >
                      Σήμερα
                    </Button>
                  </div>
                </div>
                <div className="custom-calendar-container">
                  <Calendar
                    onChange={handleDateChange}
                    value={selectedDate}
                    activeStartDate={viewDate}
                    onActiveStartDateChange={({ activeStartDate }) => {
                      if (activeStartDate) setViewDate(activeStartDate);
                    }}
                    locale="el-GR"
                    tileContent={tileContent}
                    className="big-calendar"
                    minDetail="year"
                    maxDetail="month"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tasks Panel */}
          <div className="space-y-6">
            {/* Add Task Form */}
            {showAddForm && canManageTasks && (
              <Card ref={formRef} style={{ borderColor: 'var(--border)' }}>
                <CardHeader>
                  <CardTitle style={{ color: 'var(--primary-gray)' }}>
                    {editingTask ? 'Επεξεργασία Εργασίας' : 'Νέα Εργασία'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                      label="Τίτλος"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      placeholder="π.χ. Επίσκεψη στον πελάτη..."
                    />

                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--primary-gray)' }}>
                        Ώρα
                      </label>
                      <input
                        type="time"
                        value={formData.time}
                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                        className="w-full px-3 py-2 border rounded-md"
                        style={{
                          borderColor: 'var(--border)',
                          backgroundColor: 'var(--white)',
                          color: 'var(--primary-gray)',
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--primary-gray)' }}>
                        Ανάθεση
                      </label>
                      <select
                        value={formData.assignedTo}
                        onChange={(e) => {
                          const value = e.target.value as "OFFICE" | "DELIVERY" | "ALL" | "USER";
                          setFormData({
                            ...formData,
                            assignedTo: value,
                            assignedUserId: value === "USER" ? formData.assignedUserId : "",
                          });
                        }}
                        className="w-full px-3 py-2 border rounded-md"
                        style={{
                          borderColor: 'var(--border)',
                          backgroundColor: 'var(--white)',
                          color: 'var(--primary-gray)',
                        }}
                      >
                        <option value="OFFICE">Office</option>
                        <option value="DELIVERY">Delivery</option>
                        <option value="ALL">Όλοι</option>
                        <option value="USER">Συγκεκριμένος χρήστης</option>
                      </select>
                    </div>

                    {formData.assignedTo === "USER" && (
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--primary-gray)' }}>
                          Επιλογή χρήστη
                        </label>
                        <select
                          value={formData.assignedUserId}
                          onChange={(e) => setFormData({ ...formData, assignedUserId: e.target.value })}
                          className="w-full px-3 py-2 border rounded-md"
                          style={{
                            borderColor: 'var(--border)',
                            backgroundColor: 'var(--white)',
                            color: 'var(--primary-gray)',
                          }}
                        >
                          <option value="">-- Επιλέξτε --</option>
                          {users.map((user) => (
                            <option key={user.uid} value={user.uid}>
                              {`${user.firstname || ""} ${user.lastname || ""}`.trim() || user.email}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--primary-gray)' }}>
                        Περιγραφή
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border rounded-md"
                        style={{
                          borderColor: 'var(--border)',
                          backgroundColor: 'var(--white)',
                          color: 'var(--primary-gray)',
                        }}
                        placeholder="Λεπτομέρειες εργασίας..."
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="submit"
                        className="bg-blue-600 hover:bg-blue-700 text-white flex-1"
                      >
                        {editingTask ? 'Ενημέρωση' : 'Δημιουργία'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowAddForm(false);
                          setEditingTask(null);
                          setFormData({
                            title: "",
                            description: "",
                            time: "09:00",
                            assignedTo: "OFFICE",
                            assignedUserId: "",
                          });
                        }}
                      >
                        Ακύρωση
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {/* Selected Date Tasks and Inspections */}
            <Card style={{ borderColor: 'var(--border)' }}>
              <CardHeader>
                <CardTitle style={{ color: 'var(--primary-gray)' }}>
                  Εργασίες & Έλεγχοι για {format(selectedDate, "dd MMMM yyyy", { locale: el })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Loader className="h-6 w-6" />
                ) : selectedDateTasks.length === 0 && selectedDateInspections.length === 0 ? (
                  <p style={{ color: 'var(--light-gray)' }}>
                    Δεν υπάρχουν εργασίες ή έλεγχοι για αυτή την ημερομηνία.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {/* Upcoming Inspections Section */}
                    {selectedDateInspections.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--primary-gray)' }}>
                          Προγραμματισμένοι Έλεγχοι ({selectedDateInspections.length})
                        </h4>
                        <div className="space-y-2">
                          {selectedDateInspections.map((insp) => (
                            <div
                              key={insp.id}
                              className="p-3 rounded-lg border"
                              style={{
                                borderColor: '#9333ea',
                                backgroundColor: 'rgba(147, 51, 234, 0.05)',
                              }}
                            >
                              <div className="flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 mt-0.5" style={{ color: '#9333ea' }} />
                                <div className="flex-1">
                                  <h4 className="font-medium" style={{ color: 'var(--primary-gray)' }}>
                                    {insp.customerName}
                                  </h4>
                                  <div className="text-sm mt-1 space-y-1" style={{ color: 'var(--light-gray)' }}>
                                    <div>Κατάστημα: {insp.storeName}</div>
                                    <div>Τύπος: {insp.type}</div>
                                    <div className="text-xs">ID: {insp.extinguisherID}</div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Tasks Section */}
                    {selectedDateTasks.length > 0 && (
                      <div>
                        <h4 className="text-sm font-semibold mb-2" style={{ color: 'var(--primary-gray)' }}>
                          Εργασίες ({selectedDateTasks.length})
                        </h4>
                        <div className="space-y-2">
                          {selectedDateTasks.map((task) => (
                            <div
                              key={task.id}
                              className="p-3 rounded-lg border"
                              style={{
                                borderColor: 'var(--border)',
                                backgroundColor: task.completed ? 'rgba(34, 197, 94, 0.05)' : 'var(--white)',
                              }}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => toggleComplete(task)}
                                      className="p-1 hover:bg-gray-100 rounded"
                                    >
                                      {task.completed ? (
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                      ) : (
                                        <Circle className="h-4 w-4" style={{ color: 'var(--light-gray)' }} />
                                      )}
                                    </button>
                                    <div>
                                      <h4
                                        className={`font-medium ${task.completed ? 'line-through' : ''}`}
                                        style={{ color: task.completed ? 'var(--light-gray)' : 'var(--primary-gray)' }}
                                      >
                                        {task.title}
                                      </h4>
                                      <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--light-gray)' }}>
                                        <span className="flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          {task.time}
                                        </span>
                                        <span
                                          className="px-2 py-1 rounded text-xs text-white"
                                          style={{ backgroundColor: getTaskColor(task) }}
                                        >
                                          {getAssignmentLabel(task)}
                                        </span>
                                      </div>
                                      {task.description && (
                                        <p className="text-sm mt-1" style={{ color: 'var(--light-gray)' }}>
                                          {task.description}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {canManageTasks && (
                                  <div className="flex gap-1 ml-2">
                                    <button
                                      onClick={() => handleEdit(task)}
                                      className="p-1 hover:bg-blue-100 rounded"
                                      title="Επεξεργασία"
                                    >
                                      <Edit className="h-4 w-4 text-blue-600" />
                                    </button>
                                    <button
                                      onClick={() => task.id && handleDelete(task.id)}
                                      className="p-1 hover:bg-red-100 rounded"
                                      title="Διαγραφή"
                                    >
                                      <Trash2 className="h-4 w-4 text-red-600" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <style>{`
        /* ============================================
           ΒΑΣΙΚΟ CONTAINER & ΜΕΓΕΘΟΣ ΗΜΕΡΟΛΟΓΙΟΥ
           ============================================ */
        .custom-calendar-container {
          width: 100%;
        }
        
        .big-calendar {
          width: 100% !important;
          min-height: 600px;
          font-family: inherit;
          border: none !important;
          background: transparent !important;
        }
        
        /* ============================================
           NAVIGATION (πάνω μέρος - μήνας/έτος)
           ============================================ */
        
        .big-calendar .react-calendar__navigation__prev2-button,
        .big-calendar .react-calendar__navigation__next2-button {
          display: none !important;
        }
        
        .big-calendar .react-calendar__navigation {
          height: 60px;
          margin-bottom: 0px;
        }
        
        .big-calendar .react-calendar__navigation button {
          min-width: 44px;
          background-color: #2563eb;
          border: none;
          color: white;
          font-size: 16px;
          font-weight: 600;
          border-radius: 8px;
        }
        
        .big-calendar .react-calendar__navigation button:enabled:hover {
          background-color: #1d4ed8;
          color: white;
        }
        
        .big-calendar .react-calendar__navigation button:enabled:focus {
          background-color: #2563eb;
          color: white;
        }
        
        /* Weekdays row */
        .big-calendar .react-calendar__month-view__weekdays {
          text-align: center;
          text-transform: uppercase;
          font-weight: bold;
          font-size: 0.75rem;
          color: white;
          text-decoration: none;
          background-color: #1e293b;
        }
        
        .big-calendar .react-calendar__month-view__weekdays__weekday {
          padding: 0.75rem 0.5rem;
        }
        
        /* Tiles */
        .big-calendar .react-calendar__tile {
          max-width: initial;
          height: 120px;
          padding: 8px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          font-size: 14px;
          font-weight: 500;
          color: #0f172a;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          justify-content: flex-start;
          position: relative;
        }
        
        .big-calendar .react-calendar__tile:enabled:hover {
          background-color: rgba(14, 165, 233, 0.08) !important;
        }
        
        /* Active day tile */
        .big-calendar .react-calendar__tile--active {
          background: #2563eb !important;
          color: white !important;
          font-weight: bold;
          border: 2px solid #2563eb;
        }

        .big-calendar .react-calendar__tile--active:enabled:hover {
          background: #1d4ed8 !important;
          opacity: 1;
        }
        
        .big-calendar .react-calendar__tile--active .task-time,
        .big-calendar .react-calendar__tile--active .task-title {
          color: white !important;
        }
        
        /* Today tile */
        .big-calendar .react-calendar__tile--now abbr {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: auto;
          height: auto;
          padding: 4px 8px;
          background: #0ea5e9;
          color: white !important;
          border-radius: 6px;
          font-weight: bold;
        }
        
        .big-calendar .react-calendar__tile--now {
          background: #f0f9ff !important;
          font-weight: bold;
        }
        
        .big-calendar .react-calendar__tile--now:enabled:hover {
          background: rgba(14, 165, 233, 0.12) !important;
        }
        
        .big-calendar .react-calendar__tile--now:enabled:hover abbr {
          background: #0284c7 !important;
          color: white !important;
        }
        
        .big-calendar .react-calendar__tile--active.react-calendar__tile--now {
          background: #2563eb !important;
          color: white !important;
        }

        .big-calendar .react-calendar__tile--active.react-calendar__tile--now:enabled:hover {
          background: #1d4ed8 !important;
        }

        .big-calendar .react-calendar__tile--active.react-calendar__tile--now:enabled:hover abbr {
          background: white !important;
          color: #2563eb !important;
        }
        
        .big-calendar .react-calendar__tile--active.react-calendar__tile--now abbr {
          background: white !important;
          color: #2563eb !important;
        }
        
        /* ============================================
           TASK DISPLAY (Εμφάνιση εργασιών με τίτλους)
           ============================================ */
        
        .task-list {
          margin-top: 6px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          width: 100%;
          font-size: 10px;
        }
        
        .task-item {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 2px 4px;
          border-left: 3px solid;
          border-radius: 4px;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          transition: opacity 0.2s ease;
        }

        .task-item:hover {
          opacity: 0.8;
        }
        
        .task-time {
          font-weight: 600;
          color: #0f172a;
          font-size: 9px;
          flex-shrink: 0;
        }
        
        .task-title {
          color: #0f172a;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
        }
        
        .task-more {
          font-size: 9px;
          font-weight: bold;
          text-align: center;
          margin-top: 2px;
          padding: 2px;
        }
        
        .react-calendar__month-view__days__day--neighboringMonth {
          color: #94a3b8 !important;
          opacity: 0.5;
        }

        #today-button {
          border: 1.5px solid #2563eb;
          color: #2563eb;
          background-color: transparent;
          transition: all 0.15s ease;
        }

        #today-button:hover {
          background-color: #2563eb;
          color: white !important;
          border-color: #2563eb;
        }

        #today-button:active {
          background-color: #1d4ed8;
          border-color: #1d4ed8;
        }

      `}</style>
    </div>
  );
};
