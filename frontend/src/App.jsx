import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

// -- SVG Icons --
function DashboardIcon({ size = 20, active = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={active ? "#fff" : "#94a3b8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" />
      <rect x="14" y="3" width="7" height="5" />
      <rect x="14" y="12" width="7" height="9" />
      <rect x="3" y="16" width="7" height="5" />
    </svg>
  );
}

function ProjectsIcon({ size = 20, active = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={active ? "#fff" : "#94a3b8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function TasksIcon({ size = 20, active = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={active ? "#fff" : "#94a3b8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 11 12 14 22 4" stroke="#10b981" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}

function SearchIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

// -- Brand Logo --
function TresvanceLogo({ size = 22 }) {
  return (
    <svg width={size * 4.5} height={size} viewBox="0 0 180 40" fill="none" style={{ cursor: "pointer" }}>
      <text x="0" y="30" fontFamily="'Helvetica Neue',Arial,sans-serif" fontSize="30" fontWeight="300" fill="#fff">tres</text>
      <text x="62" y="30" fontFamily="'Helvetica Neue',Arial,sans-serif" fontSize="30" fontWeight="700" fill="#29ABE2">v</text>
      <text x="80" y="30" fontFamily="'Helvetica Neue',Arial,sans-serif" fontSize="30" fontWeight="300" fill="#fff">ance</text>
    </svg>
  );
}

// -- Avatar Helper --
function UserAvatar({ name = "Admin", size = 36 }) {
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const color = `hsl(${Math.abs(hash) % 360}, 65%, 45%)`;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: color,
      color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.4, fontWeight: 700, flexShrink: 0, border: "2px solid #fff", boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
    }}>
      {initials}
    </div>
  );
}

const PROJECT_STAGES = [
  "Project Created",
  "Requirements Gathering",
  "Planning",
  "UI/UX Design",
  "Development Started",
  "Development in Progress",
  "Ready for Deployment",
  "Live Implementation",
  "Project Live",
  "Support & Maintenance",
  "Project Closed"
];

export default function App() {
  const [view, setView] = useState(() => localStorage.getItem("app_view") || "portal"); // "portal" or "dashboard"
  const [activeTab, setActiveTab] = useState("dashboard"); // dashboard, projects, tasks, add_project
  
  // Database States
  const [projects, setProjects] = useState([]);
  const [timesheets, setTimesheets] = useState([]);
  const [kanbanTasks, setKanbanTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [kanbanFilterProject, setKanbanFilterProject] = useState("all");
  const [selectedProject, setSelectedProject] = useState(null);

  // Authentication States
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(() => localStorage.getItem("admin_authenticated") === "true");

  // Create New Project Form States (Light Modern UI fields matching the image)
  const [projName, setProjName] = useState("");
  const [projClient, setProjClient] = useState("");
  const [projCode, setProjCode] = useState("");
  const [projManager, setProjManager] = useState("Admin");
  const [projStartDate, setProjStartDate] = useState("");
  const [projEndDate, setProjEndDate] = useState("");
  const [projPriority, setProjPriority] = useState("Low");
  const [projStatus, setProjStatus] = useState("Planning");

  const [projType, setProjType] = useState("Fixed Price");
  const [projBudget, setProjBudget] = useState("");
  const [projCurrency, setProjCurrency] = useState("INR (₹)");
  const [projEstHours, setProjEstHours] = useState("");
  const [projDepartment, setProjDepartment] = useState("Select Department");
  const [projTags, setProjTags] = useState([]);
  const [tagInput, setTagInput] = useState("");

  const [selectedMembers, setSelectedMembers] = useState([]);
  const [memberSearchText, setMemberSearchText] = useState("");

  // Create New Task Form States (Premium Light-Mode matching the task image)
  const [taskName, setTaskName] = useState("");
  const [taskProjectId, setTaskProjectId] = useState("");
  const [taskMilestone, setTaskMilestone] = useState("Select Milestone (Optional)");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskChecklist, setTaskChecklist] = useState([]);
  const [taskChecklistInput, setTaskChecklistInput] = useState("");
  const [taskAssignedTo, setTaskAssignedTo] = useState("");
  const [taskAssignBy, setTaskAssignBy] = useState(() => localStorage.getItem("admin_logged_in_name") || "Jibin Jose");
  const [taskPriority, setTaskPriority] = useState("Low");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskEstHours, setTaskEstHours] = useState("");
  const [taskStatus, setTaskStatus] = useState("To Do");
  const [taskTags, setTaskTags] = useState([]);
  const [taskTagInput, setTaskTagInput] = useState("");
  const [teamMembers, setTeamMembers] = useState([]);
  const [isEditingProject, setIsEditingProject] = useState(false);
  const [projectEditingId, setProjectEditingId] = useState(null);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState("Frontend Developer");
  const [detailsActiveTab, setDetailsActiveTab] = useState("Overview");
  
  const [selectedTask, setSelectedTask] = useState(null);
  const [loggedActualHours, setLoggedActualHours] = useState("");
  const [taskDetailsChecklistInput, setTaskDetailsChecklistInput] = useState("");
  const [taskDetailsCommentInput, setTaskDetailsCommentInput] = useState("");

  const [tasksSubTab, setTasksSubTab] = useState("List");
  const [filterProject, setFilterProject] = useState("");
  const [filterAssignee, setFilterAssignee] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [tasksPage, setTasksPage] = useState(1);

  const [projectsSubTab, setProjectsSubTab] = useState("All Projects");
  const [filterProjManager, setFilterProjManager] = useState("");
  const [filterProjMode, setFilterProjMode] = useState("");
  const [filterProjPriority, setFilterProjPriority] = useState("");
  const [projectsPage, setProjectsPage] = useState(1);

  const [formSuccessMessage, setFormSuccessMessage] = useState("");
  const [formErrorMessage, setFormErrorMessage] = useState("");

  const refreshData = () => {
    setLoading(true);
    Promise.all([
      axios.get("/api/home/"),
      axios.get("/api/timesheets/"),
      axios.get("/api/tasks/"),
      axios.get("/api/team-members/")
    ])
      .then(([projRes, tsRes, taskRes, teamRes]) => {
        setProjects(projRes.data);
        setTimesheets(tsRes.data);
        setTeamMembers(teamRes.data);
        
        const cards = taskRes.data.map((task) => {
          const projectSlug = task.project_name ? task.project_name.substring(0, 3).toUpperCase() : "TASK";
          let col = "todo";
          if (task.status === "In Progress") col = "inprogress";
          if (task.status === "Testing") col = "testing";
          if (task.status === "Completed") col = "completed";
          if (task.priority === "Critical") col = "backlog";

          return {
            id: task.id,
            code: `#${projectSlug}-${task.id}`,
            title: task.name,
            developer: task.assigned_to || "Unassigned",
            project: task.project_name || "Unknown Project",
            projectId: task.project,
            hours: parseFloat(task.estimated_hours) || 0,
            amount: 0,
            date: task.due_date,
            column: col,
            rawTask: task
          };
        });

        if (cards.length === 0) {
          let cardIdCounter = 1;
          tsRes.data.forEach(ts => {
            ts.tasks.forEach(task => {
              const projectSlug = ts.project_name ? ts.project_name.substring(0, 3).toUpperCase() : "TS";
              const cols = ["backlog", "todo", "inprogress", "testing", "completed"];
              const col = cols[(task.id || cardIdCounter) % cols.length];

              cards.push({
                id: task.id || cardIdCounter,
                code: `#${projectSlug}-${task.id || cardIdCounter}`,
                title: task.description,
                developer: ts.employee_name || "Unknown Dev",
                project: ts.project_name || "Internal Project",
                projectId: ts.project,
                hours: parseFloat(task.hours) || 0,
                amount: parseFloat(task.amount) || 0,
                date: ts.date,
                column: col
              });
              cardIdCounter++;
            });
          });
        }
        setKanbanTasks(cards);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    refreshData();
  }, []);

  const moveTask = (taskId, newCol) => {
    let apiStatus = "To Do";
    if (newCol === "inprogress") apiStatus = "In Progress";
    if (newCol === "testing") apiStatus = "Testing";
    if (newCol === "completed") apiStatus = "Completed";

    setKanbanTasks(prev => prev.map(t => t.id === taskId ? { ...t, column: newCol } : t));

    const taskObj = kanbanTasks.find(t => t.id === taskId);
    if (taskObj && taskObj.rawTask) {
      axios.patch(`/api/tasks/${taskId}/`, { status: apiStatus })
        .then(() => refreshData())
        .catch(err => console.error("Error updating task status:", err));
    }
  };

  const handleDashboardClick = () => {
    if (isAuthenticated) {
      setView("dashboard");
      localStorage.setItem("app_view", "dashboard");
    } else {
      setShowLoginModal(true);
      setLoginError("");
    }
  };

  const handleLoginSubmit = (e) => {
    e.preventDefault();
    setLoginError("");
    
    axios.post("/api/admin-login/", { email: username, password })
      .then(res => {
        if (res.data.success) {
          setIsAuthenticated(true);
          localStorage.setItem("admin_authenticated", "true");
          localStorage.setItem("admin_logged_in_name", res.data.name || "Admin");
          setTaskAssignBy(res.data.name || "Admin");
          setShowLoginModal(false);
          setView("dashboard");
          localStorage.setItem("app_view", "dashboard");
          setUsername("");
          setPassword("");
        } else {
          setLoginError(res.data.error || "Invalid username or password");
        }
      })
      .catch(() => {
        setLoginError("Authentication server error. Try again.");
      });
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("admin_authenticated");
    setView("portal");
    localStorage.setItem("app_view", "portal");
  };

  // Add Tags on Enter
  const handleTagKeyPress = (e) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      if (!projTags.includes(tagInput.trim())) {
        setProjTags(prev => [...prev, tagInput.trim()]);
      }
      setTagInput("");
    }
  };

  const removeTag = (indexToRemove) => {
    setProjTags(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Add Member
  const addTeamMember = (name, role) => {
    if (name.trim() && !selectedMembers.some(m => m.name === name)) {
      setSelectedMembers(prev => [...prev, { name, role }]);
    }
    setMemberSearchText("");
  };

  const removeTeamMember = (indexToRemove) => {
    setSelectedMembers(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  // Task specific handlers
  const handleTaskTagKeyPress = (e) => {
    if (e.key === "Enter" && taskTagInput.trim()) {
      e.preventDefault();
      if (!taskTags.includes(taskTagInput.trim())) {
        setTaskTags(prev => [...prev, taskTagInput.trim()]);
      }
      setTaskTagInput("");
    }
  };

  const removeTaskTag = (indexToRemove) => {
    setTaskTags(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const addChecklistItem = () => {
    if (taskChecklistInput.trim()) {
      setTaskChecklist(prev => [...prev, { text: taskChecklistInput.trim(), checked: false }]);
      setTaskChecklistInput("");
    }
  };

  const toggleChecklistItem = (index) => {
    setTaskChecklist(prev => prev.map((item, idx) => idx === index ? { ...item, checked: !item.checked } : item));
  };

  const removeChecklistItem = (index) => {
    setTaskChecklist(prev => prev.filter((_, idx) => idx !== index));
  };

  const [taskEditingId, setTaskEditingId] = useState(null);

  const resetTaskForm = () => {
    setTaskName("");
    setTaskProjectId("");
    setTaskMilestone("Select Milestone (Optional)");
    setTaskDescription("");
    setTaskChecklist([]);
    setTaskChecklistInput("");
    setTaskAssignedTo("");
    setTaskAssignBy(localStorage.getItem("admin_logged_in_name") || "Jibin Jose");
    setTaskPriority("Low");
    setTaskDueDate("");
    setTaskEstHours("");
    setTaskStatus("To Do");
    setTaskTags([]);
    setTaskTagInput("");
    setTaskEditingId(null);
  };

  const handleSaveTask = () => {
    setFormErrorMessage("");
    setFormSuccessMessage("");

    if (!taskName.trim()) {
      setFormErrorMessage("Task Name is required.");
      return;
    }
    if (!taskProjectId) {
      setFormErrorMessage("Project is required.");
      return;
    }
    if (!taskAssignedTo) {
      setFormErrorMessage("Assigned To is required.");
      return;
    }

    const payload = {
      name: taskName,
      project: parseInt(taskProjectId),
      milestone: taskMilestone,
      description: taskDescription,
      checklist: taskChecklist,
      assigned_to: taskAssignedTo,
      assigned_by: taskAssignBy,
      priority: taskPriority,
      due_date: taskDueDate || new Date().toISOString().split("T")[0],
      estimated_hours: parseFloat(taskEstHours) || 0,
      status: taskStatus,
      tags: taskTags
    };

    const url = taskEditingId ? `/api/tasks/${taskEditingId}/` : "/api/tasks/";
    const reqMethod = taskEditingId ? axios.put : axios.post;

    reqMethod(url, payload)
      .then((res) => {
        setFormSuccessMessage(taskEditingId ? "Task updated successfully!" : "Task created successfully!");
        refreshData();
        if (taskEditingId) {
          setSelectedTask(res.data);
        }
        setTimeout(() => {
          setActiveTab(taskEditingId ? "task_details" : "tasks");
          resetTaskForm();
        }, 1000);
      })
      .catch((err) => {
        const errData = err.response?.data;
        setFormErrorMessage(errData ? JSON.stringify(errData) : "Server error when saving task.");
      });
  };

  const resetProjectForm = () => {
    setProjName("");
    setProjClient("");
    setProjCode("");
    setProjManager("Admin");
    setProjStartDate("");
    setProjEndDate("");
    setProjPriority("Low");
    setProjStatus("Planning");
    setProjType("Fixed Price");
    setProjBudget("");
    setProjCurrency("INR (₹)");
    setProjEstHours("");
    setProjDepartment("Select Department");
    setProjTags([]);
    setSelectedMembers([]);
    setIsEditingProject(false);
    setProjectEditingId(null);
  };

  const handleEditProjectClick = (project) => {
    const details = parseProjectRemarks(project.remarks);
    
    setProjName(project.name);
    setProjClient(details.client);
    setProjCode(details.code);
    setProjManager(details.manager);
    setProjStartDate(details.startDate === "—" ? "" : details.startDate);
    setProjEndDate(details.endDate === "—" ? "" : details.endDate);
    setProjPriority(details.priority);
    
    let apiStatus = "Planning";
    if (project.mode === "PROD") apiStatus = "Completed";
    if (project.mode === "MAINT") apiStatus = "Maintenance";
    setProjStatus(apiStatus);
    
    let rawBudget = details.budget;
    if (rawBudget.includes(" ")) {
      const parts = rawBudget.split(" ");
      setProjBudget(parts[parts.length - 1]);
    } else {
      setProjBudget(rawBudget);
    }
    
    setProjEstHours(details.estimatedHours === "—" ? "" : details.estimatedHours);
    setProjDepartment(details.department);
    setProjTags(details.tags);
    setSelectedMembers(details.members);
    setProjUrl(project.url || "");

    setIsEditingProject(true);
    setProjectEditingId(project.id);
    setActiveTab("add_project");
  };

  const handleAddMemberToProjectSubmit = () => {
    if (!newMemberName) return;
    
    const details = parseProjectRemarks(selectedProject.remarks);
    
    if (details.members.some(m => m.name === newMemberName)) {
      alert("Member is already assigned to this project.");
      return;
    }

    const updatedMembersList = [...details.members, { name: newMemberName, role: newMemberRole }];
    
    const richRemarks = `
Client: ${details.client}
Project Code: ${details.code}
Project Manager: ${details.manager}
Dates: ${details.startDate} to ${details.endDate}
Priority: ${details.priority}
Budget: ${details.budget}
Estimated Hours: ${details.estimatedHours} hrs
Department: ${details.department}
Tags: ${details.tags.join(", ") || "None"}
Members: ${updatedMembersList.map(m => `${m.name} (${m.role})`).join(", ")}
`.trim();

    const payload = {
      remarks: richRemarks
    };

    axios.patch(`/api/home/${selectedProject.id}/`, payload)
      .then((res) => {
        setSelectedProject(res.data);
        refreshData();
        setShowAddMemberModal(false);
        setNewMemberName("");
      })
      .catch((err) => {
        console.error("Error adding member:", err);
      });
  };

  const handleUpdateProjectStage = (stageName) => {
    const details = parseProjectRemarks(selectedProject.remarks);
    
    const richRemarks = `
Client: ${details.client}
Project Code: ${details.code}
Project Manager: ${details.manager}
Dates: ${details.startDate} to ${details.endDate}
Priority: ${details.priority}
Budget: ${details.budget}
Estimated Hours: ${details.estimatedHours} hrs
Department: ${details.department}
Tags: ${details.tags.join(", ") || "None"}
Current Stage: ${stageName}
Members: ${details.members.map(m => `${m.name} (${m.role})`).join(", ")}
`.trim();

    axios.patch(`/api/home/${selectedProject.id}/`, { remarks: richRemarks })
      .then((res) => {
        setSelectedProject(res.data);
        refreshData();
      })
      .catch((err) => {
        console.error("Error updating project stage:", err);
      });
  };

  const handleOpenTaskDetails = (task) => {
    axios.get(`/api/tasks/${task.id}/`)
      .then((res) => {
        setSelectedTask(res.data);
        setActiveTab("task_details");
      })
      .catch((err) => {
        console.error("Error loading task details:", err);
        setSelectedTask(task.rawTask || task);
        setActiveTab("task_details");
      });
  };

  const handleUpdateTaskStatus = (taskId, newStatus) => {
    const user = localStorage.getItem("admin_logged_in_name") || "Admin";
    const newLog = {
      action: `Status changed to ${newStatus}`,
      timestamp: new Date().toISOString(),
      by: user
    };
    const currentTask = selectedTask;
    const updatedLog = [...(currentTask?.activity_log || []), newLog];

    axios.patch(`/api/tasks/${taskId}/`, { status: newStatus, activity_log: updatedLog })
      .then((res) => {
        setSelectedTask(res.data);
        refreshData();
      })
      .catch(err => console.error("Error updating task status:", err));
  };

  const handleToggleChecklistDetails = (idx) => {
    if (!selectedTask) return;
    const user = localStorage.getItem("admin_logged_in_name") || "Admin";
    const updatedChecklist = selectedTask.checklist.map((item, i) =>
      i === idx ? { ...item, checked: !item.checked } : item
    );
    const targetItem = selectedTask.checklist[idx];
    const newLog = {
      action: `Checklist item "${targetItem.text}" marked as ${!targetItem.checked ? "completed" : "incomplete"}`,
      timestamp: new Date().toISOString(),
      by: user
    };
    const updatedLog = [...(selectedTask.activity_log || []), newLog];

    axios.patch(`/api/tasks/${selectedTask.id}/`, {
      checklist: updatedChecklist,
      activity_log: updatedLog
    })
      .then((res) => {
        setSelectedTask(res.data);
        refreshData();
      })
      .catch(err => console.error("Error toggling checklist item:", err));
  };

  const handleAddChecklistDetailsItem = () => {
    if (!taskDetailsChecklistInput.trim() || !selectedTask) return;
    const user = localStorage.getItem("admin_logged_in_name") || "Admin";
    const newItem = { text: taskDetailsChecklistInput.trim(), checked: false };
    const updatedChecklist = [...(selectedTask.checklist || []), newItem];
    
    const newLog = {
      action: `Added checklist item "${newItem.text}"`,
      timestamp: new Date().toISOString(),
      by: user
    };
    const updatedLog = [...(selectedTask.activity_log || []), newLog];

    axios.patch(`/api/tasks/${selectedTask.id}/`, {
      checklist: updatedChecklist,
      activity_log: updatedLog
    })
      .then((res) => {
        setSelectedTask(res.data);
        setTaskDetailsChecklistInput("");
        refreshData();
      })
      .catch(err => console.error("Error adding checklist item:", err));
  };

  const handleLogHours = () => {
    const hoursVal = parseFloat(loggedActualHours);
    if (isNaN(hoursVal) || hoursVal <= 0 || !selectedTask) return;
    const user = localStorage.getItem("admin_logged_in_name") || "Admin";
    
    const updatedActualHours = (parseFloat(selectedTask.actual_hours) || 0) + hoursVal;
    const newLog = {
      action: `Logged ${hoursVal} hrs (Total Actual: ${updatedActualHours} hrs)`,
      timestamp: new Date().toISOString(),
      by: user
    };
    const updatedLog = [...(selectedTask.activity_log || []), newLog];

    axios.patch(`/api/tasks/${selectedTask.id}/`, {
      actual_hours: updatedActualHours,
      activity_log: updatedLog
    })
      .then((res) => {
        setSelectedTask(res.data);
        setLoggedActualHours("");
        refreshData();
      })
      .catch(err => console.error("Error logging hours:", err));
  };

  const handlePostTaskComment = () => {
    if (!taskDetailsCommentInput.trim() || !selectedTask) return;
    const user = localStorage.getItem("admin_logged_in_name") || "Admin";
    const newComment = {
      author: user,
      content: taskDetailsCommentInput.trim(),
      timestamp: new Date().toISOString()
    };
    const updatedComments = [...(selectedTask.comments || []), newComment];
    
    const newLog = {
      action: "Comment added",
      timestamp: new Date().toISOString(),
      by: user
    };
    const updatedLog = [...(selectedTask.activity_log || []), newLog];

    axios.patch(`/api/tasks/${selectedTask.id}/`, {
      comments: updatedComments,
      activity_log: updatedLog
    })
      .then((res) => {
        setSelectedTask(res.data);
        setTaskDetailsCommentInput("");
        refreshData();
      })
      .catch(err => console.error("Error posting comment:", err));
  };

  const handleUploadTaskAttachment = (e) => {
    const file = e.target.files[0];
    if (!file || !selectedTask) return;
    const user = localStorage.getItem("admin_logged_in_name") || "Admin";

    const newAttachment = {
      filename: file.name,
      sizeBytes: file.size,
      uploadedAt: new Date().toISOString(),
      uploadedBy: user
    };
    const updatedAttachments = [...(selectedTask.attachments || []), newAttachment];
    
    const newLog = {
      action: `Attachment uploaded: ${file.name}`,
      timestamp: new Date().toISOString(),
      by: user
    };
    const updatedLog = [...(selectedTask.activity_log || []), newLog];

    axios.patch(`/api/tasks/${selectedTask.id}/`, {
      attachments: updatedAttachments,
      activity_log: updatedLog
    })
      .then((res) => {
        setSelectedTask(res.data);
        refreshData();
      })
      .catch(err => console.error("Error uploading attachment:", err));
  };

  const parseProjectRemarks = (remarks = "") => {
    const result = {
      client: "—",
      code: "—",
      manager: "Admin",
      startDate: "—",
      endDate: "—",
      priority: "Low",
      budget: "—",
      estimatedHours: "—",
      department: "Development",
      tags: [],
      members: [],
      currentStage: "Project Created",
      description: ""
    };

    if (!remarks) return result;

    const clientMatch = remarks.match(/Client:\s*(.*)/i);
    const codeMatch = remarks.match(/Project Code:\s*(.*)/i);
    const managerMatch = remarks.match(/Project Manager:\s*(.*)/i);
    const datesMatch = remarks.match(/Dates:\s*(.*?)\s*to\s*(.*)/i);
    const priorityMatch = remarks.match(/Priority:\s*(.*)/i);
    const budgetMatch = remarks.match(/Budget:\s*(.*)/i);
    const estHoursMatch = remarks.match(/Estimated Hours:\s*(.*)/i);
    const deptMatch = remarks.match(/Department:\s*(.*)/i);
    const tagsMatch = remarks.match(/Tags:\s*(.*)/i);
    const membersMatch = remarks.match(/Members:\s*(.*)/i);
    const stageMatch = remarks.match(/Current Stage:\s*(.*)/i);

    if (clientMatch) result.client = clientMatch[1].trim();
    if (codeMatch) result.code = codeMatch[1].trim();
    if (managerMatch) result.manager = managerMatch[1].trim();
    if (datesMatch) {
      result.startDate = datesMatch[1].trim();
      result.endDate = datesMatch[2].trim();
    }
    if (priorityMatch) result.priority = priorityMatch[1].trim();
    if (budgetMatch) result.budget = budgetMatch[1].trim();
    if (estHoursMatch) result.estimatedHours = estHoursMatch[1].replace(/hrs|hr/gi, "").trim();
    if (deptMatch) result.department = deptMatch[1].trim();
    if (stageMatch) result.currentStage = stageMatch[1].trim();
    if (tagsMatch && tagsMatch[1].trim()) {
      result.tags = tagsMatch[1].split(",").map(t => t.trim());
    }
    if (membersMatch && membersMatch[1].trim()) {
      result.members = membersMatch[1].split(",").map(m => {
        const parts = m.trim().match(/(.*?)\s*\((.*?)\)/);
        if (parts) {
          return { name: parts[1], role: parts[2] };
        }
        return { name: m.trim(), role: "Developer" };
      });
    }

    const lines = remarks.split("\n");
    const descriptionLines = lines.filter(line => 
      !line.startsWith("Client:") &&
      !line.startsWith("Project Code:") &&
      !line.startsWith("Project Manager:") &&
      !line.startsWith("Dates:") &&
      !line.startsWith("Priority:") &&
      !line.startsWith("Budget:") &&
      !line.startsWith("Estimated Hours:") &&
      !line.startsWith("Department:") &&
      !line.startsWith("Tags:") &&
      !line.startsWith("Current Stage:") &&
      !line.startsWith("Members:")
    );
    result.description = descriptionLines.join("\n").trim() || remarks;

    return result;
  };

  const formatDateStr = (dateStr) => {
    if (!dateStr || dateStr === "—") return "—";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Save project matching the Django Model structure
  const handleSaveProject = () => {
    setFormErrorMessage("");
    setFormSuccessMessage("");

    if (!projName.trim()) {
      setFormErrorMessage("Project Name is required.");
      return;
    }

    // Format fields that don't exist directly into the 'remarks' text block
    const richRemarks = `
Client: ${projClient}
Project Code: ${projCode}
Project Manager: ${projManager}
Dates: ${projStartDate || "—"} to ${projEndDate || "—"}
Priority: ${projPriority}
Budget: ${projCurrency} ${projBudget || "0"}
Estimated Hours: ${projEstHours || "0"} hrs
Department: ${projDepartment}
Tags: ${projTags.join(", ") || "None"}
Members: ${selectedMembers.map(m => `${m.name} (${m.role})`).join(", ")}
`.trim();

    // Map priority or status back to DEV/PROD/MAINT
    let apiMode = "DEV";
    if (projStatus === "Completed") apiMode = "PROD";
    if (projStatus === "Maintenance") apiMode = "MAINT";

    const payload = {
      name: projName,
      mode: apiMode,
      version: "1.0.0",
      url: projUrl || "",
      remarks: richRemarks,
      hourly_rate: 0
    };

    const request = isEditingProject 
      ? axios.put(`/api/home/${projectEditingId}/`, payload)
      : axios.post("/api/home/", payload);

    request
      .then((res) => {
        setFormSuccessMessage(isEditingProject ? "Project updated successfully!" : "Project created successfully!");
        if (isEditingProject) {
          setSelectedProject(res.data);
        }
        refreshData();
        setTimeout(() => {
          setActiveTab(isEditingProject ? "project_details" : "projects");
          resetProjectForm();
          setIsEditingProject(false);
          setProjectEditingId(null);
        }, 1000);
      })
      .catch((err) => {
        const errData = err.response?.data;
        setFormErrorMessage(errData ? JSON.stringify(errData) : "Server error when saving project.");
      });
  };

  // Calculations
  const totalProjectsCount = projects.length;
  const activeProjectsCount = projects.filter(p => p.mode === "DEV" || p.mode === "PROD").length;
  const developers = [...new Set(timesheets.map(t => t.employee_name))];
  const developersCount = developers.length;

  const backlogTasks = kanbanTasks.filter(t => t.column === "backlog");
  const todoTasks = kanbanTasks.filter(t => t.column === "todo");
  const inProgressTasks = kanbanTasks.filter(t => t.column === "inprogress");
  const testingTasks = kanbanTasks.filter(t => t.column === "testing");
  const completedTasks = kanbanTasks.filter(t => t.column === "completed");

  const pendingTasksCount = backlogTasks.length + todoTasks.length + inProgressTasks.length + testingTasks.length;
  const completedTasksCount = completedTasks.length;

  const todayStr = new Date().toISOString().split("T")[0];
  const todayHours = timesheets.filter(t => t.date === todayStr).reduce((sum, t) => sum + (parseFloat(t.total_hours) || 0), 0);
  const todayHrsInt = Math.floor(todayHours);
  const todayMinsInt = Math.round((todayHours - todayHrsInt) * 60);
  const todayTimeStr = todayMinsInt ? `${todayHrsInt}h ${todayMinsInt}m` : `${todayHrsInt}h`;

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const weekHours = timesheets.filter(t => new Date(t.date) >= oneWeekAgo).reduce((sum, t) => sum + (parseFloat(t.total_hours) || 0), 0);
  const weekHrsInt = Math.floor(weekHours);
  const weekMinsInt = Math.round((weekHours - weekHrsInt) * 60);
  const weekTimeStr = weekMinsInt ? `${weekHrsInt}h ${weekMinsInt}m` : `${weekHrsInt}h`;

  const donutSegments = [
    { label: "To Do", count: todoTasks.length, color: "#2563eb" },
    { label: "In Progress", count: inProgressTasks.length, color: "#10b981" },
    { label: "Review", count: backlogTasks.length, color: "#eab308" },
    { label: "Testing", count: testingTasks.length, color: "#8b5cf6" },
    { label: "Completed", count: completedTasks.length, color: "#06b6d4" }
  ];

  let currentOffset = 100;
  const donutCircles = donutSegments.map((seg, idx) => {
    if (kanbanTasks.length === 0) return null;
    const pct = (seg.count / kanbanTasks.length) * 100;
    if (pct === 0) return null;
    const dashOffset = currentOffset;
    currentOffset -= pct;
    return (
      <circle key={idx} cx="21" cy="21" r="15.915" fill="transparent"
        stroke={seg.color} strokeWidth="4.2"
        strokeDasharray={`${pct} ${100 - pct}`}
        strokeDashoffset={dashOffset}
      />
    );
  });

  const modeColor = {
    DEV:  { bg: "#dbeafe", text: "#1e40af" },
    TEST: { bg: "#fef3c7", text: "#92400e" },
    PROD: { bg: "#d1fae5", text: "#065f46" },
  };

  const filteredProjects = projects.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.mode?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "'DM Sans', sans-serif" }}>
      
      {/* ── View A: OLD PORTAL VIEW ────────────────────────────────────────── */}
      {view === "portal" && (
        <div style={{ minHeight: "100vh", background: "#f4f7f9" }}>
          <header style={{ background: "#111", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 16px rgba(0,0,0,0.3)" }}>
            <div style={{ height: 3, background: "linear-gradient(90deg,#29ABE2,#1a7aad)" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 36px", height: 58 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <TresvanceLogo size={22} />
                <div style={{ width: 1, height: 20, background: "#333" }} />
                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 3, color: "#555" }}>Softwares</span>
              </div>
              
              <button onClick={handleDashboardClick}
                style={{
                  background: "linear-gradient(135deg, #2563eb, #29ABE2)", color: "#fff", border: "none",
                  padding: "8px 16px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer", transition: "opacity .15s",
                  boxShadow: "0 4px 10px rgba(41,171,226,0.2)"
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = 0.85}
                onMouseLeave={e => e.currentTarget.style.opacity = 1}>
                📊 PM Dashboard
              </button>
            </div>
          </header>

          <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px 60px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24 }}>
              <div>
                <h1 style={{ fontSize: 26, fontWeight: 700, color: "#111", margin: 0 }}>Projects</h1>
                <p style={{ fontSize: 13, color: "#999", marginTop: 4 }}>All active projects at Tresvance Softwares</p>
              </div>
              <input
                type="text" placeholder="Search projects..."
                value={search} onChange={(e) => setSearch(e.target.value)}
                style={{ border: "1.5px solid #e2eaf0", borderRadius: 7, padding: "9px 14px", fontSize: 13, width: 220, background: "#fff", color: "#111" }}
              />
            </div>

            {loading ? (
              <div style={emptyBox}>Loading projects...</div>
            ) : filteredProjects.length === 0 ? (
              <div style={emptyBox}>No projects found</div>
            ) : (
              <div style={{ background: "#fff", border: "1px solid #e2eaf0", borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.05)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 70px 2.5fr 70px 1.5fr", background: "#111" }}>
                  {["Project Name", "Mode", "URL", "Version", "Remarks"].map((h) => (
                    <div key={h} style={{ padding: "12px 18px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5, color: "#888" }}>{h}</div>
                  ))}
                </div>

                {filteredProjects.map((project, i) => {
                  const mc = modeColor[project.mode] || { bg: "#f3f4f6", text: "#374151" };
                  return (
                    <div key={project.id}
                      style={{ display: "grid", gridTemplateColumns: "1.2fr 70px 2.5fr 70px 1.5fr", borderBottom: "1px solid #f0f4f7", background: i % 2 === 0 ? "#fff" : "#fafcfd", transition: "background .15s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#f0f7fc"}
                      onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#fafcfd"}>

                      <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#29ABE2", flexShrink: 0 }} />
                        <span style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>{project.name}</span>
                      </div>

                      <div style={{ padding: "14px 10px", display: "flex", alignItems: "center" }}>
                        <span style={{ background: mc.bg, color: mc.text, borderRadius: 20, padding: "3px 9px", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, whiteSpace: "nowrap" }}>
                          {project.mode}
                        </span>
                      </div>

                      <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", overflow: "hidden" }}>
                        {project.url ? (
                          <a href={project.url} target="_blank" rel="noopener noreferrer"
                            title={project.url}
                            style={{ color: "#29ABE2", textDecoration: "none", fontSize: 13, display: "flex", alignItems: "center", gap: 5, minWidth: 0, width: "100%" }}
                            onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                            onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}>
                            <span style={{ fontSize: 11, flexShrink: 0 }}>🔗</span>
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{project.url}</span>
                          </a>
                        ) : <span style={{ color: "#ccc", fontSize: 13 }}>—</span>}
                      </div>

                      <div style={{ padding: "14px 10px", display: "flex", alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: "#888", background: "#f4f4f4", borderRadius: 4, padding: "2px 7px", fontWeight: 600 }}>v{project.version}</span>
                      </div>

                      <div style={{ padding: "14px 18px", display: "flex", alignItems: "flex-start" }}>
                        <span style={{ fontSize: 13, color: "#666", lineHeight: 1.5, wordBreak: "break-word" }}>
                          {project.remarks || <span style={{ color: "#ddd" }}>—</span>}
                        </span>
                      </div>
                    </div>
                  );
                })}

                <div style={{ padding: "10px 18px", background: "#fafcfd", borderTop: "1px solid #f0f4f7", fontSize: 12, color: "#bbb" }}>
                  {filteredProjects.length} project{filteredProjects.length !== 1 ? "s" : ""}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── View B: NEW ADMIN DASHBOARD VIEW ───────────────────────────────── */}
      {view === "dashboard" && (
        <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc", color: "#1e293b" }}>
          
          <aside style={{ width: 260, background: "#0b1224", display: "flex", flexDirection: "column", flexShrink: 0 }}>
            <div style={{ padding: "28px 24px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #1e293b" }}>
              <div style={{ display: "flex", position: "relative", width: 28, height: 28 }}>
                <span style={{ position: "absolute", left: 0, top: 0, width: 8, height: 28, background: "#2563eb", borderRadius: 4 }} />
                <span style={{ position: "absolute", left: 12, top: 0, width: 16, height: 8, background: "#29ABE2", borderRadius: 4 }} />
                <span style={{ position: "absolute", left: 12, bottom: 0, width: 8, height: 16, background: "#06b6d4", borderRadius: 4 }} />
              </div>
              <div>
                <h2 style={{ color: "#fff", fontSize: 18, fontWeight: 800, letterSpacing: 1.5, margin: 0 }}>TRESVANCE</h2>
                <p style={{ color: "#64748b", fontSize: 10, letterSpacing: 0.5, margin: 0 }}>Project Management Portal</p>
              </div>
            </div>

            <nav style={{ flex: 1, padding: "24px 16px" }}>
              <ul style={{ listStyle: "none" }}>
                <li style={{ marginBottom: 8 }}>
                  <button onClick={() => setActiveTab("dashboard")}
                    style={{
                      width: "100%", border: "none", outline: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 8,
                      fontSize: 14, fontWeight: 600, transition: "all .15s",
                      background: activeTab === "dashboard" ? "linear-gradient(135deg, #2563eb, #29ABE2)" : "transparent",
                      color: activeTab === "dashboard" ? "#fff" : "#94a3b8"
                    }}>
                    <DashboardIcon active={activeTab === "dashboard"} />
                    Dashboard
                  </button>
                </li>
                <li style={{ marginBottom: 8 }}>
                  <button onClick={() => setActiveTab("projects")}
                    style={{
                      width: "100%", border: "none", outline: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 8,
                      fontSize: 14, fontWeight: 600, transition: "all .15s",
                      background: activeTab === "projects" || activeTab === "add_project" ? "linear-gradient(135deg, #2563eb, #29ABE2)" : "transparent",
                      color: activeTab === "projects" || activeTab === "add_project" ? "#fff" : "#94a3b8"
                    }}>
                    <ProjectsIcon active={activeTab === "projects" || activeTab === "add_project"} />
                    Projects
                  </button>
                </li>
                <li style={{ marginBottom: 8 }}>
                  <button onClick={() => setActiveTab("tasks")}
                    style={{
                      width: "100%", border: "none", outline: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 8,
                      fontSize: 14, fontWeight: 600, transition: "all .15s",
                      background: activeTab === "tasks" ? "linear-gradient(135deg, #2563eb, #29ABE2)" : "transparent",
                      color: activeTab === "tasks" ? "#fff" : "#94a3b8"
                    }}>
                    <TasksIcon active={activeTab === "tasks"} />
                    Tasks
                  </button>
                </li>

                <li style={{ marginTop: 24, borderTop: "1px solid #1e293b", paddingTop: 16 }}>
                  <button onClick={() => {
                    setView("portal");
                    localStorage.setItem("app_view", "portal");
                  }}
                    style={{
                      width: "100%", border: "none", outline: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 8,
                      fontSize: 14, fontWeight: 600, transition: "all .15s",
                      background: "transparent", color: "#94a3b8"
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#1e293b"; e.currentTarget.style.color = "#fff"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#94a3b8"; }}>
                    🏠 Client Portal
                  </button>
                </li>

                <li style={{ marginTop: 8 }}>
                  <button onClick={handleLogout}
                    style={{
                      width: "100%", border: "none", outline: "none", cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 8,
                      fontSize: 14, fontWeight: 600, transition: "all .15s",
                      background: "transparent", color: "#f87171"
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#7f1d1d"; e.currentTarget.style.color = "#fca5a5"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#f87171"; }}>
                    🚪 Logout Admin
                  </button>
                </li>
              </ul>
            </nav>

            <div style={{ padding: 20, borderTop: "1px solid #1e293b", display: "flex", alignItems: "center", gap: 12 }}>
              <UserAvatar name="Admin" size={38} />
              <div>
                <div style={{ color: "#fff", fontSize: 13, fontWeight: 700 }}>Admin</div>
                <div style={{ color: "#64748b", fontSize: 11 }}>Admin</div>
              </div>
            </div>
          </aside>

          <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
            <header style={{ height: 68, background: "#fff", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 32px", position: "sticky", top: 0, zIndex: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, maxWidth: 400 }}>
                <SearchIcon />
                <input type="text"
                  placeholder="Search projects, tasks, users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ border: "none", outline: "none", background: "transparent", fontSize: 14, width: "100%", color: "#1e293b" }}
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>Tresvance Solutions</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
                </div>

                <a href="/admin/" target="_blank" rel="noopener noreferrer"
                  style={{
                    textDecoration: "none", background: "linear-gradient(135deg, #1e293b, #0f172a)", color: "#fff",
                    padding: "8px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 6, border: "1px solid #1e293b", transition: "opacity 0.2s"
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 0.85}
                  onMouseLeave={e => e.currentTarget.style.opacity = 1}>
                  🎛️ Admin Panel
                </a>
              </div>
            </header>

            <main style={{ flex: 1, padding: "32px 32px 64px", overflowY: "auto" }}>
              
              {/* Tab 1: Dashboard */}
              {activeTab === "dashboard" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
                    <div>
                      <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0 }}>Dashboard</h1>
                      <p style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>Welcome back, Admin! 👋</p>
                    </div>
                    <div style={{ display: "flex", gap: 12 }}>
                      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "10px 16px", fontSize: 13, fontWeight: 600, color: "#475569", display: "flex", alignItems: "center", gap: 8 }}>
                        📅 {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </div>
                      <button onClick={() => setActiveTab("add_project")}
                        style={{ border: "none", cursor: "pointer", background: "linear-gradient(135deg, #2563eb, #29ABE2)", color: "#fff", borderRadius: 8, padding: "10px 18px", fontSize: 13, fontWeight: 700, boxShadow: "0 4px 12px rgba(37,99,235,0.2)" }}>
                        + New Project
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 20, marginBottom: 28 }}>
                    <div style={statsCard}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                        <div>
                          <div style={statsLbl}>Total Projects</div>
                          <div style={statsVal}>{totalProjectsCount}</div>
                        </div>
                        <div style={{ ...statsIcon, background: "#eff6ff" }}>📁</div>
                      </div>
                      <div style={statsLink} onClick={() => setActiveTab("projects")}>View all projects →</div>
                    </div>

                    <div style={statsCard}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                        <div>
                          <div style={statsLbl}>Active Projects</div>
                          <div style={statsVal}>{activeProjectsCount}</div>
                        </div>
                        <div style={{ ...statsIcon, background: "#ecfdf5" }}>📋</div>
                      </div>
                      <div style={statsLink} onClick={() => setActiveTab("projects")}>View all →</div>
                    </div>

                    <div style={statsCard}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                        <div>
                          <div style={statsLbl}>Pending Tasks</div>
                          <div style={statsVal}>{pendingTasksCount}</div>
                        </div>
                        <div style={{ ...statsIcon, background: "#fffbe5" }}>⏳</div>
                      </div>
                      <div style={statsLink} onClick={() => setActiveTab("tasks")}>View tasks →</div>
                    </div>

                    <div style={statsCard}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                        <div>
                          <div style={statsLbl}>Completed Tasks</div>
                          <div style={statsVal}>{completedTasksCount}</div>
                        </div>
                        <div style={{ ...statsIcon, background: "#fff5f5" }}>✅</div>
                      </div>
                      <div style={statsLink} onClick={() => setActiveTab("tasks")}>View tasks →</div>
                    </div>

                    <div style={statsCard}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                        <div>
                          <div style={statsLbl}>Team Members</div>
                          <div style={statsVal}>{developersCount}</div>
                        </div>
                        <div style={{ ...statsIcon, background: "#f5f3ff" }}>👥</div>
                      </div>
                      <div style={statsLink}>View team →</div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: 24, marginBottom: 28 }}>
                    <div style={cardWrap}>
                      <div style={cardHeader}>
                        <h3 style={cardTitle}>Project Progress Overview</h3>
                        <span style={{ fontSize: 11, color: "#64748b", background: "#f1f5f9", padding: "3px 8px", borderRadius: 4, fontWeight: 700 }}>All Projects</span>
                      </div>
                      <div style={{ padding: "0 20px 20px" }}>
                        {projects.length === 0 ? (
                          <div style={{ padding: "20px 0", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No projects logged</div>
                        ) : (
                          projects.map((p, idx) => {
                            const projectTasks = kanbanTasks.filter(t => String(t.projectId) === String(p.id));
                            const completed = projectTasks.filter(t => t.column === "completed").length;
                            const progress = projectTasks.length ? Math.round((completed / projectTasks.length) * 100) : 0;
                            const colors = ["#2563eb", "#10b981", "#f97316", "#8b5cf6", "#ef4444"];
                            const color = colors[idx % colors.length];
                            
                            return (
                              <div key={p.id} style={{ marginBottom: 16 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                                  <span>{p.name}</span>
                                  <span style={{ color: "#475569" }}>{progress}%</span>
                                </div>
                                <div style={{ height: 6, background: "#e2e8f0", borderRadius: 3, overflow: "hidden" }}>
                                  <div style={{ height: "100%", width: `${progress}%`, background: color, borderRadius: 3 }} />
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    <div style={cardWrap}>
                      <div style={cardHeader}>
                        <h3 style={cardTitle}>Tasks Status</h3>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 20px 20px", flex: 1 }}>
                        <div style={{ position: "relative", width: 140, height: 140, marginBottom: 16 }}>
                          <svg width="140" height="140" viewBox="0 0 42 42" className="donut">
                            <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#e2e8f0" strokeWidth="4.2" />
                            {donutCircles}
                          </svg>
                          <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>{kanbanTasks.length}</span>
                            <span style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Total</span>
                          </div>
                        </div>

                        <div style={{ width: "100%", display: "flex", flexWrap: "wrap", gap: "6px 12px", fontSize: 11, fontWeight: 600, justifyContent: "center" }}>
                          {donutSegments.map((seg, idx) => {
                            const pctText = kanbanTasks.length ? `(${Math.round((seg.count / kanbanTasks.length) * 100)}%)` : "(0%)";
                            return (
                              <div key={idx} style={legendItem}>
                                <span style={{ ...dot, background: seg.color }} /> {seg.label} ({seg.count}) {pctText}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div style={cardWrap}>
                      <div style={cardHeader}>
                        <h3 style={cardTitle}>Upcoming Deadlines</h3>
                        <span style={{ fontSize: 11, color: "#2563eb", fontWeight: 700, cursor: "pointer" }}>View all</span>
                      </div>
                      <div style={{ padding: "0 20px 20px", display: "flex", flexDirection: "column", justifyContent: "center", flex: 1 }}>
                        <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: "20px 0" }}>
                          No upcoming deadlines configured
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "3.2fr 1.5fr", gap: 24 }}>
                    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.02)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0f172a", margin: 0 }}>Kanban Board</h3>
                          <select value={kanbanFilterProject} onChange={(e) => setKanbanFilterProject(e.target.value)}
                            style={{ border: "1.5px solid #e2eaf0", borderRadius: 6, padding: "4px 10px", fontSize: 12, fontWeight: 600, background: "#fff" }}>
                            <option value="all">All Projects</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                        <span style={{ fontSize: 12, color: "#2563eb", fontWeight: 700, cursor: "pointer" }}>View Board</span>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
                        {[
                          { id: "backlog", label: "Backlog", tasks: backlogTasks, color: "#f8fafc" },
                          { id: "todo", label: "To Do", tasks: todoTasks, color: "#eff6ff" },
                          { id: "inprogress", label: "In Progress", tasks: inProgressTasks, color: "#ecfdf5" },
                          { id: "testing", label: "Testing", tasks: testingTasks, color: "#fdf4ff" },
                          { id: "completed", label: "Completed", tasks: completedTasks, color: "#f0fdf4" }
                        ].map(col => {
                          const filteredColTasks = kanbanFilterProject === "all" ? col.tasks : col.tasks.filter(t => String(t.projectId) === String(kanbanFilterProject));
                          const finalTasks = filteredColTasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()) || t.developer.toLowerCase().includes(search.toLowerCase()));
                          return (
                            <div key={col.id} style={{ background: "#f8fafc", borderRadius: 8, padding: 10, minHeight: 300 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                                <span style={{ fontSize: 11, fontWeight: 800, color: "#334155" }}>{col.label}</span>
                                <span style={{ fontSize: 10, background: "#e2e8f0", padding: "1px 6px", borderRadius: 10, fontWeight: 700, color: "#475569" }}>{finalTasks.length}</span>
                              </div>
                              
                              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {finalTasks.map(task => (
                                  <div key={task.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, padding: 10, boxShadow: "0 2px 4px rgba(0,0,0,0.02)", position: "relative" }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>{task.project}</div>
                                    <div onClick={() => handleOpenTaskDetails(task)} style={{ fontSize: 11, fontWeight: 700, color: "#2563eb", cursor: "pointer", textDecoration: "underline", marginBottom: 8, lineHeight: 1.4, wordBreak: "break-word" }}>{task.title}</div>
                                    
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                                      <span style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700 }}>{task.code}</span>
                                      <UserAvatar name={task.developer} size={22} />
                                    </div>

                                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 4, marginTop: 8, paddingTop: 6, borderTop: "1px solid #f1f5f9" }}>
                                      {col.id !== "backlog" && (
                                        <button onClick={() => {
                                          const steps = ["backlog", "todo", "inprogress", "testing", "completed"];
                                          moveTask(task.id, steps[steps.indexOf(col.id) - 1]);
                                        }} style={moveBtn} title="Move Left">◀</button>
                                      )}
                                      {col.id !== "completed" && (
                                        <button onClick={() => {
                                          const steps = ["backlog", "todo", "inprogress", "testing", "completed"];
                                          moveTask(task.id, steps[steps.indexOf(col.id) + 1]);
                                        }} style={moveBtn} title="Move Right">▶</button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", margin: 0 }}>Recent Activity</h3>
                        <span style={{ fontSize: 11, color: "#2563eb", fontWeight: 700 }}>View all</span>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1 }}>
                        {timesheets.length === 0 ? (
                          <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 13, padding: "20px 0" }}>No recent activity logs</div>
                        ) : (
                          timesheets.slice(0, 5).map((ts, idx) => {
                            const taskDesc = ts.tasks[0]?.description || "Logged hours";
                            return (
                              <div key={idx} style={{ display: "flex", gap: 10, fontSize: 12 }}>
                                <UserAvatar name={ts.employee_name} size={30} />
                                <div>
                                  <div>
                                    <strong style={{ color: "#0f172a" }}>{ts.employee_name}</strong> logged{" "}
                                    <strong style={{ color: "#2563eb" }}>{ts.total_hours} hrs</strong> on{" "}
                                    <span style={{ color: "#475569" }}>{ts.project_name}</span>
                                  </div>
                                  <div style={{ color: "#64748b", marginTop: 2, fontStyle: "italic" }}>"{taskDesc.substring(0, 45)}..."</div>
                                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>{new Date(ts.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginTop: 28 }}>
                    <div style={bottomStat}>
                      <div style={bottomStatIcon}>🕒</div>
                      <div>
                        <div style={bottomStatLabel}>Time Logged Today</div>
                        <div style={bottomStatValue}>{todayTimeStr}</div>
                      </div>
                    </div>
                    <div style={bottomStat}>
                      <div style={bottomStatIcon}>📅</div>
                      <div>
                        <div style={bottomStatLabel}>This Week</div>
                        <div style={bottomStatValue}>{weekTimeStr}</div>
                      </div>
                    </div>
                    <div style={bottomStat}>
                      <div style={bottomStatIcon}>🚨</div>
                      <div>
                        <div style={bottomStatLabel}>Overdue Tasks</div>
                        <div style={bottomStatValue}>0</div>
                      </div>
                    </div>
                    <div style={bottomStat}>
                      <div style={bottomStatIcon}>👥</div>
                      <div>
                        <div style={bottomStatLabel}>Team Availability</div>
                        <div style={bottomStatValue}>100%</div>
                      </div>
                    </div>
                    <div style={bottomStat}>
                      <div style={bottomStatIcon}>🐛</div>
                      <div>
                        <div style={bottomStatLabel}>Open Issues</div>
                        <div style={bottomStatValue}>0</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Projects */}
              {activeTab === "projects" && (() => {
                const filteredProjectsList = projects.filter(project => {
                  const matchQuery = !search.trim() || 
                    project.name.toLowerCase().includes(search.toLowerCase()) ||
                    project.client.toLowerCase().includes(search.toLowerCase()) ||
                    (project.project_code && project.project_code.toLowerCase().includes(search.toLowerCase()));

                  const matchManager = !filterProjManager || project.project_manager === filterProjManager;
                  const matchMode = !filterProjMode || project.mode === filterProjMode;
                  
                  const remarksVal = project.remarks || "";
                  const priorityMatch = remarksVal.match(/priority:\s*(Low|Medium|High|Critical)/i);
                  const projPriority = priorityMatch ? priorityMatch[1] : "Medium";
                  const matchPriority = !filterProjPriority || projPriority === filterProjPriority;

                  const matchSubTab = projectsSubTab !== "My Projects" || project.project_manager === (localStorage.getItem("admin_logged_in_name") || "Admin");

                  return matchQuery && matchManager && matchMode && matchPriority && matchSubTab;
                });

                const itemsPerPage = 5;
                const totalItems = filteredProjectsList.length;
                const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
                const startIndex = (projectsPage - 1) * itemsPerPage;
                const paginatedProjects = filteredProjectsList.slice(startIndex, startIndex + itemsPerPage);

                const handleResetProjFilters = () => {
                  setFilterProjManager("");
                  setFilterProjMode("");
                  setFilterProjPriority("");
                  setProjectsPage(1);
                };

                const priorityColors = {
                  Low: { bg: "#ecfdf5", text: "#047857" },
                  Medium: { bg: "#fef9c3", text: "#a16207" },
                  High: { bg: "#ffedd5", text: "#c2410c" },
                  Critical: { bg: "#fee2e2", text: "#b91c1c" }
                };

                const modeColors = {
                  "PROD": { bg: "#f0fdf4", text: "#166534" },
                  "DEV": { bg: "#eff6ff", text: "#1e40af" },
                  "TEST": { bg: "#fff7ed", text: "#c2410c" }
                };

                return (
                  <div>
                    {/* Header bar */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <button onClick={() => setActiveTab("dashboard")} 
                          style={{ border: "none", background: "none", cursor: "pointer", fontSize: 20, color: "#0f172a", padding: "0 4px" }}
                          title="Back">
                          ←
                        </button>
                        <div>
                          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", margin: 0 }}>Projects</h2>
                          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, fontWeight: 600 }}>
                            Dashboard &nbsp;&gt;&nbsp; <span style={{ color: "#64748b" }}>Projects</span>
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ display: "flex", gap: 12 }}>
                        <button style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 6, padding: "8px 16px", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                          Export ▾
                        </button>
                        <button onClick={() => { resetProjectForm(); setActiveTab("add_project"); }}
                          style={{ background: "linear-gradient(135deg, #2563eb, #29ABE2)", border: "none", borderRadius: 6, padding: "8px 16px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                          + Add Project
                        </button>
                      </div>
                    </div>

                    {/* Navigation Subtabs */}
                    <div style={{ display: "flex", gap: 24, borderBottom: "1px solid #e2e8f0", marginBottom: 20 }}>
                      {["All Projects", "My Projects", "Archived"].map((tab) => {
                        const active = projectsSubTab === tab;
                        return (
                          <button key={tab} onClick={() => { setProjectsSubTab(tab); setProjectsPage(1); }}
                            style={{
                              background: "none", border: "none", borderBottom: active ? "2.5px solid #2563eb" : "2.5px solid transparent",
                              color: active ? "#2563eb" : "#64748b", padding: "10px 4px", fontSize: 13, fontWeight: active ? 800 : 600, cursor: "pointer"
                            }}>
                            {tab}
                          </button>
                        );
                      })}
                    </div>

                    {/* Filter bar */}
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
                      <select value={filterProjManager} onChange={e => { setFilterProjManager(e.target.value); setProjectsPage(1); }}
                        style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: "8px 12px", fontSize: 12, color: "#475569", background: "#fff", minWidth: 160 }}>
                        <option value="">Select Manager</option>
                        {teamMembers.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                      </select>

                      <select value={filterProjMode} onChange={e => { setFilterProjMode(e.target.value); setProjectsPage(1); }}
                        style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: "8px 12px", fontSize: 12, color: "#475569", background: "#fff", minWidth: 140 }}>
                        <option value="">Select Mode</option>
                        <option value="PROD">PROD</option>
                        <option value="DEV">DEV</option>
                        <option value="TEST">TEST</option>
                      </select>

                      <select value={filterProjPriority} onChange={e => { setFilterProjPriority(e.target.value); setProjectsPage(1); }}
                        style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: "8px 12px", fontSize: 12, color: "#475569", background: "#fff", minWidth: 140 }}>
                        <option value="">Select Priority</option>
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>

                      <button onClick={handleResetProjFilters}
                        style={{ background: "none", border: "none", color: "#2563eb", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center" }}>
                        Reset
                      </button>
                    </div>

                    {loading ? (
                      <div style={emptyBox}>Loading projects...</div>
                    ) : paginatedProjects.length === 0 ? (
                      <div style={emptyBox}>No projects configured or match criteria.</div>
                    ) : (
                      <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.01)" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                          <thead>
                            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569", fontWeight: 700 }}>
                              <th style={{ padding: "14px 20px" }}>Code</th>
                              <th style={{ padding: "14px 20px" }}>Project Name</th>
                              <th style={{ padding: "14px 20px" }}>Client</th>
                              <th style={{ padding: "14px 20px" }}>Project Manager</th>
                              <th style={{ padding: "14px 20px" }}>Priority</th>
                              <th style={{ padding: "14px 20px" }}>Mode</th>
                              <th style={{ padding: "14px 20px" }}>Timeline</th>
                              <th style={{ padding: "14px 20px" }}>Budget</th>
                              <th style={{ padding: "14px 20px" }}>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedProjects.map((project) => {
                              const pmName = project.project_manager || "Jibin Jose";
                              const remarksVal = project.remarks || "";
                              const priorityMatch = remarksVal.match(/priority:\s*(Low|Medium|High|Critical)/i);
                              const projPriority = priorityMatch ? priorityMatch[1] : "Medium";
                              const priColors = priorityColors[projPriority] || { bg: "#f1f5f9", text: "#475569" };

                              const modeVal = project.mode || "DEV";
                              const mColors = modeColors[modeVal] || { bg: "#f1f5f9", text: "#475569" };

                              return (
                                <tr key={project.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                  <td style={{ padding: "14px 20px", fontWeight: 700, color: "#64748b", fontSize: 11 }}>
                                    {project.project_code || `#PROJ-${project.id}`}
                                  </td>
                                  <td style={{ padding: "14px 20px" }}>
                                    <span onClick={() => { setSelectedProject(project); setActiveTab("project_details"); }}
                                      style={{ fontWeight: 700, color: "#2563eb", cursor: "pointer", textDecoration: "underline" }}
                                      onMouseEnter={e => e.currentTarget.style.color = "#1d4ed8"}
                                      onMouseLeave={e => e.currentTarget.style.color = "#2563eb"}>
                                      {project.name}
                                    </span>
                                  </td>
                                  <td style={{ padding: "14px 20px", color: "#64748b" }}>{project.client}</td>
                                  <td style={{ padding: "14px 20px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                      <UserAvatar name={pmName} size={22} />
                                      <span style={{ fontWeight: 700, color: "#0f172a" }}>{pmName}</span>
                                    </div>
                                  </td>
                                  <td style={{ padding: "14px 20px" }}>
                                    <span style={{ background: priColors.bg, color: priColors.text, padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>
                                      {projPriority}
                                    </span>
                                  </td>
                                  <td style={{ padding: "14px 20px" }}>
                                    <span style={{ background: mColors.bg, color: mColors.text, padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>
                                      {modeVal}
                                    </span>
                                  </td>
                                  <td style={{ padding: "14px 20px", color: "#475569" }}>
                                    {formatDateStr(project.start_date)} - {formatDateStr(project.end_date)}
                                  </td>
                                  <td style={{ padding: "14px 20px", fontWeight: 700, color: "#166534" }}>{project.budget}</td>
                                  <td style={{ padding: "14px 20px" }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                      <span onClick={() => { setSelectedProject(project); setActiveTab("project_details"); }} title="View Details" style={{ cursor: "pointer", fontSize: 15 }}>👁️</span>
                                      <span style={{ cursor: "pointer", fontSize: 15, color: "#94a3b8" }}>⋮</span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>

                        {/* Pagination footer */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
                          <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
                            Showing {Math.min(startIndex + 1, totalItems)} to {Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems} projects
                          </span>

                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <button onClick={() => setProjectsPage(prev => Math.max(1, prev - 1))} disabled={projectsPage === 1}
                              style={{ border: "1px solid #cbd5e1", background: "#fff", color: projectsPage === 1 ? "#cbd5e1" : "#475569", borderRadius: 6, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: projectsPage === 1 ? "not-allowed" : "pointer", fontSize: 12 }}>
                              ‹
                            </button>
                            
                            {Array.from({ length: totalPages }).map((_, idx) => {
                              const pNum = idx + 1;
                              const active = projectsPage === pNum;
                              return (
                                <button key={pNum} onClick={() => setProjectsPage(pNum)}
                                  style={{
                                    border: "1px solid", borderColor: active ? "#2563eb" : "#cbd5e1",
                                    background: active ? "#2563eb" : "#fff", color: active ? "#fff" : "#475569",
                                    borderRadius: 6, width: 28, height: 28, cursor: "pointer", fontSize: 12, fontWeight: 700
                                  }}>
                                  {pNum}
                                </button>
                              );
                            })}

                            <button onClick={() => setProjectsPage(prev => Math.min(totalPages, prev + 1))} disabled={projectsPage === totalPages}
                              style={{ border: "1px solid #cbd5e1", background: "#fff", color: projectsPage === totalPages ? "#cbd5e1" : "#475569", borderRadius: 6, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: projectsPage === totalPages ? "not-allowed" : "pointer", fontSize: 12 }}>
                              ›
                            </button>
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Tab 3: Tasks */}
              {activeTab === "tasks" && (() => {
                // Filter logic
                const filteredTasksList = kanbanTasks.filter(task => {
                  const matchQuery = !search.trim() || 
                    task.title.toLowerCase().includes(search.toLowerCase()) ||
                    task.developer.toLowerCase().includes(search.toLowerCase()) ||
                    task.project.toLowerCase().includes(search.toLowerCase()) ||
                    task.code.toLowerCase().includes(search.toLowerCase());
                    
                  const matchProject = !filterProject || String(task.projectId) === String(filterProject);
                  const matchAssignee = !filterAssignee || task.developer === filterAssignee;
                  
                  const taskApiStatus = task.rawTask?.status || task.status || "To Do";
                  const matchStatus = !filterStatus || taskApiStatus === filterStatus;
                  
                  const taskApiPriority = task.rawTask?.priority || "Low";
                  const matchPriority = !filterPriority || taskApiPriority === filterPriority;
                  
                  const taskDate = task.date ? new Date(task.date) : null;
                  const matchStartDate = !filterStartDate || (taskDate && taskDate >= new Date(filterStartDate));
                  const matchEndDate = !filterEndDate || (taskDate && taskDate <= new Date(filterEndDate + "T23:59:59"));
                  
                  const loggedUser = localStorage.getItem("admin_logged_in_name") || "Admin";
                  const matchSubTab = tasksSubTab !== "My Tasks" || task.developer === loggedUser;
                  
                  return matchQuery && matchProject && matchAssignee && matchStatus && matchPriority && matchStartDate && matchEndDate && matchSubTab;
                });

                const itemsPerPage = 5;
                const totalItems = filteredTasksList.length;
                const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
                const startIndex = (tasksPage - 1) * itemsPerPage;
                const paginatedTasks = filteredTasksList.slice(startIndex, startIndex + itemsPerPage);

                const handleResetFilters = () => {
                  setFilterProject("");
                  setFilterAssignee("");
                  setFilterStatus("");
                  setFilterPriority("");
                  setFilterStartDate("");
                  setFilterEndDate("");
                  setTasksPage(1);
                };

                const priorityColors = {
                  Low: { bg: "#ecfdf5", text: "#047857" },
                  Medium: { bg: "#fef9c3", text: "#a16207" },
                  High: { bg: "#ffedd5", text: "#c2410c" },
                  Critical: { bg: "#fee2e2", text: "#b91c1c" }
                };

                const statusColors = {
                  "To Do": { bg: "#eff6ff", text: "#1d4ed8" },
                  "In Progress": { bg: "#ecfdf5", text: "#059669" },
                  "Testing": { bg: "#fdf4ff", text: "#8b5cf6" },
                  "Completed": { bg: "#f0fdf4", text: "#166534" }
                };

                return (
                  <div>
                    {/* Tasks Header Bar */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <button onClick={() => setActiveTab("dashboard")} 
                          style={{ border: "none", background: "none", cursor: "pointer", fontSize: 20, color: "#0f172a", padding: "0 4px" }}
                          title="Back">
                          ←
                        </button>
                        <div>
                          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", margin: 0 }}>Tasks</h2>
                          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, fontWeight: 600 }}>
                            Dashboard &nbsp;&gt;&nbsp; <span style={{ color: "#64748b" }}>Tasks</span>
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ display: "flex", gap: 12 }}>
                        <button style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 6, padding: "8px 16px", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                          Export ▾
                        </button>
                        <button onClick={() => { resetTaskForm(); setActiveTab("add_task"); }}
                          style={{ background: "linear-gradient(135deg, #2563eb, #29ABE2)", border: "none", borderRadius: 6, padding: "8px 16px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                          + Create Task
                        </button>
                      </div>
                    </div>

                    {/* Horizontal sub-navigation tabs list */}
                    <div style={{ display: "flex", gap: 24, borderBottom: "1px solid #e2e8f0", marginBottom: 20 }}>
                      {["List", "Kanban", "Calendar", "My Tasks", "All Tasks"].map((tab) => {
                        const active = tasksSubTab === tab;
                        return (
                          <button key={tab} onClick={() => { setTasksSubTab(tab); setTasksPage(1); }}
                            style={{
                              background: "none", border: "none", borderBottom: active ? "2.5px solid #2563eb" : "2.5px solid transparent",
                              color: active ? "#2563eb" : "#64748b", padding: "10px 4px", fontSize: 13, fontWeight: active ? 800 : 600, cursor: "pointer"
                            }}>
                            {tab}
                          </button>
                        );
                      })}
                    </div>

                    {tasksSubTab === "Kanban" ? (
                      /* Display the Kanban board directly inside this sub-tab */
                      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 24, boxShadow: "0 4px 20px rgba(0,0,0,0.02)" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
                          {[
                            { id: "backlog", label: "Backlog", tasks: kanbanTasks.filter(t => t.column === "backlog"), color: "#f8fafc" },
                            { id: "todo", label: "To Do", tasks: kanbanTasks.filter(t => t.column === "todo"), color: "#eff6ff" },
                            { id: "inprogress", label: "In Progress", tasks: kanbanTasks.filter(t => t.column === "inprogress"), color: "#ecfdf5" },
                            { id: "testing", label: "Testing", tasks: kanbanTasks.filter(t => t.column === "testing"), color: "#fdf4ff" },
                            { id: "completed", label: "Completed", tasks: kanbanTasks.filter(t => t.column === "completed"), color: "#f0fdf4" }
                          ].map(col => {
                            const finalTasks = col.tasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase()) || t.developer.toLowerCase().includes(search.toLowerCase()));
                            return (
                              <div key={col.id} style={{ background: "#f8fafc", borderRadius: 8, padding: 10, minHeight: 300 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                                  <span style={{ fontSize: 11, fontWeight: 800, color: "#334155" }}>{col.label}</span>
                                  <span style={{ fontSize: 10, background: "#e2e8f0", padding: "1px 6px", borderRadius: 10, fontWeight: 700, color: "#475569" }}>{finalTasks.length}</span>
                                </div>
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                  {finalTasks.map(task => (
                                    <div key={task.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 6, padding: 10, boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
                                      <div style={{ fontSize: 10, fontWeight: 700, color: "#64748b", marginBottom: 4 }}>{task.project}</div>
                                      <div onClick={() => handleOpenTaskDetails(task)} style={{ fontSize: 11, fontWeight: 700, color: "#2563eb", cursor: "pointer", textDecoration: "underline", marginBottom: 8, lineHeight: 1.4, wordBreak: "break-word" }}>{task.title}</div>
                                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                                        <span style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700 }}>{task.code}</span>
                                        <UserAvatar name={task.developer} size={22} />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      /* Display the list page structure matching screen details */
                      <div>
                        {/* Filters row bar */}
                        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
                          <select value={filterProject} onChange={e => { setFilterProject(e.target.value); setTasksPage(1); }}
                            style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: "8px 12px", fontSize: 12, color: "#475569", background: "#fff", minWidth: 140 }}>
                            <option value="">Select Project</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>

                          <select value={filterAssignee} onChange={e => { setFilterAssignee(e.target.value); setTasksPage(1); }}
                            style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: "8px 12px", fontSize: 12, color: "#475569", background: "#fff", minWidth: 140 }}>
                            <option value="">Select Assignee</option>
                            {teamMembers.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                          </select>

                          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setTasksPage(1); }}
                            style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: "8px 12px", fontSize: 12, color: "#475569", background: "#fff", minWidth: 130 }}>
                            <option value="">Select Status</option>
                            <option value="To Do">To Do</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Testing">Testing</option>
                            <option value="Completed">Completed</option>
                          </select>

                          <select value={filterPriority} onChange={e => { setFilterPriority(e.target.value); setTasksPage(1); }}
                            style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: "8px 12px", fontSize: 12, color: "#475569", background: "#fff", minWidth: 130 }}>
                            <option value="">Select Priority</option>
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Critical">Critical</option>
                          </select>

                          <div style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid #cbd5e1", borderRadius: 6, padding: "0 12px", background: "#fff" }}>
                            <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>Start</span>
                            <input type="date" value={filterStartDate} onChange={e => { setFilterStartDate(e.target.value); setTasksPage(1); }}
                              style={{ border: "none", outline: "none", fontSize: 12, color: "#475569", height: 32 }} />
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 6, border: "1px solid #cbd5e1", borderRadius: 6, padding: "0 12px", background: "#fff" }}>
                            <span style={{ fontSize: 11, color: "#64748b", fontWeight: 600 }}>End</span>
                            <input type="date" value={filterEndDate} onChange={e => { setFilterEndDate(e.target.value); setTasksPage(1); }}
                              style={{ border: "none", outline: "none", fontSize: 12, color: "#475569", height: 32 }} />
                          </div>

                          <button onClick={handleResetFilters}
                            style={{ background: "none", border: "none", color: "#2563eb", fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center" }}>
                            Reset
                          </button>
                        </div>

                        {loading ? (
                          <div style={emptyBox}>Loading tasks...</div>
                        ) : paginatedTasks.length === 0 ? (
                          <div style={emptyBox}>No tasks match selected filter criteria.</div>
                        ) : (
                          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", boxShadow: "0 4px 20px rgba(0,0,0,0.01)" }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, textAlign: "left" }}>
                              <thead>
                                <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#475569", fontWeight: 700 }}>
                                  <th style={{ padding: "14px 20px" }}>ID</th>
                                  <th style={{ padding: "14px 20px" }}>Task Name</th>
                                  <th style={{ padding: "14px 20px" }}>Project</th>
                                  <th style={{ padding: "14px 20px" }}>Assignee</th>
                                  <th style={{ padding: "14px 20px" }}>Priority</th>
                                  <th style={{ padding: "14px 20px" }}>Status</th>
                                  <th style={{ padding: "14px 20px" }}>Due Date</th>
                                  <th style={{ padding: "14px 20px" }}>Progress</th>
                                  <th style={{ padding: "14px 20px" }}>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {paginatedTasks.map((task) => {
                                  const taskPri = task.rawTask?.priority || "Low";
                                  const taskStat = task.rawTask?.status || task.status || "To Do";
                                  const priColors = priorityColors[taskPri] || { bg: "#f1f5f9", text: "#475569" };
                                  const statColors = statusColors[taskStat] || { bg: "#f1f5f9", text: "#475569" };

                                  // Calculate progress based on checklist items
                                  const checklist = task.rawTask?.checklist || [];
                                  const totalCheck = checklist.length;
                                  const completedCheck = checklist.filter(c => c.checked).length;
                                  const progressPct = totalCheck ? Math.round((completedCheck / totalCheck) * 100) : (taskStat === "Completed" ? 100 : 0);

                                  return (
                                    <tr key={task.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                      <td style={{ padding: "14px 20px", fontWeight: 700, color: "#64748b", fontSize: 11 }}>{task.code}</td>
                                      <td style={{ padding: "14px 20px" }}>
                                        <span onClick={() => handleOpenTaskDetails(task)}
                                          style={{ fontWeight: 700, color: "#0f172a", cursor: "pointer", textDecoration: "none" }}
                                          onMouseEnter={e => e.currentTarget.style.color = "#2563eb"}
                                          onMouseLeave={e => e.currentTarget.style.color = "#0f172a"}>
                                          {task.title}
                                        </span>
                                      </td>
                                      <td style={{ padding: "14px 20px", color: "#64748b" }}>{task.project}</td>
                                      <td style={{ padding: "14px 20px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                          <UserAvatar name={task.developer} size={22} />
                                          <span style={{ fontWeight: 700, color: "#0f172a" }}>{task.developer}</span>
                                        </div>
                                      </td>
                                      <td style={{ padding: "14px 20px" }}>
                                        <span style={{ background: priColors.bg, color: priColors.text, padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>
                                          {taskPri}
                                        </span>
                                      </td>
                                      <td style={{ padding: "14px 20px" }}>
                                        <span style={{ background: statColors.bg, color: statColors.text, padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700 }}>
                                          {taskStat}
                                        </span>
                                      </td>
                                      <td style={{ padding: "14px 20px", color: "#475569" }}>{formatDateStr(task.date)}</td>
                                      <td style={{ padding: "14px 20px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                          <div style={{ width: 60, height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
                                            <div style={{ width: `${progressPct}%`, height: "100%", background: progressPct === 100 ? "#10b981" : "#2563eb" }} />
                                          </div>
                                          <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>{progressPct}%</span>
                                        </div>
                                      </td>
                                      <td style={{ padding: "14px 20px" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                          <span onClick={() => handleOpenTaskDetails(task)} title="View Details" style={{ cursor: "pointer", fontSize: 15 }}>👁️</span>
                                          <span style={{ cursor: "pointer", fontSize: 15, color: "#94a3b8" }}>⋮</span>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>

                            {/* Pagination footer bar */}
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "#f8fafc", borderTop: "1px solid #e2e8f0" }}>
                              <span style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>
                                Showing {Math.min(startIndex + 1, totalItems)} to {Math.min(startIndex + itemsPerPage, totalItems)} of {totalItems} tasks
                              </span>

                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <button onClick={() => setTasksPage(prev => Math.max(1, prev - 1))} disabled={tasksPage === 1}
                                  style={{ border: "1px solid #cbd5e1", background: "#fff", color: tasksPage === 1 ? "#cbd5e1" : "#475569", borderRadius: 6, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: tasksPage === 1 ? "not-allowed" : "pointer", fontSize: 12 }}>
                                  ‹
                                </button>
                                
                                {Array.from({ length: totalPages }).map((_, idx) => {
                                  const pNum = idx + 1;
                                  const active = tasksPage === pNum;
                                  return (
                                    <button key={pNum} onClick={() => setTasksPage(pNum)}
                                      style={{
                                        border: "1px solid", borderColor: active ? "#2563eb" : "#cbd5e1",
                                        background: active ? "#2563eb" : "#fff", color: active ? "#fff" : "#475569",
                                        borderRadius: 6, width: 28, height: 28, cursor: "pointer", fontSize: 12, fontWeight: 700
                                      }}>
                                      {pNum}
                                    </button>
                                  );
                                })}

                                <button onClick={() => setTasksPage(prev => Math.min(totalPages, prev + 1))} disabled={tasksPage === totalPages}
                                  style={{ border: "1px solid #cbd5e1", background: "#fff", color: tasksPage === totalPages ? "#cbd5e1" : "#475569", borderRadius: 6, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: tasksPage === totalPages ? "not-allowed" : "pointer", fontSize: 12 }}>
                                  ›
                                </button>
                              </div>
                            </div>

                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Tab 4: Create Project (Premium Light-Mode UI matching the new image) */}
              {activeTab === "add_project" && (
                <div style={{ background: "#ffffff", borderRadius: 12, padding: 32, boxShadow: "0 10px 30px rgba(0,0,0,0.03)", border: "1px solid #e2e8f0" }}>
                  
                  {/* Light Header Title */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <button onClick={() => setActiveTab("projects")} 
                        style={{ border: "none", background: "none", cursor: "pointer", fontSize: 20, color: "#1e293b", padding: "0 4px" }}
                        title="Back">
                        ←
                      </button>
                      <div>
                        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                          {isEditingProject ? "Edit Project Details" : "Create New Project"}
                        </h2>
                        {/* Breadcrumbs */}
                        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, fontWeight: 600 }}>
                          Dashboard &nbsp;&gt;&nbsp; Projects &nbsp;&gt;&nbsp; <span style={{ color: "#64748b" }}>{isEditingProject ? "Edit Project" : "Create Project"}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Top Action Buttons */}
                    <div style={{ display: "flex", gap: 12 }}>
                      <button onClick={() => { resetProjectForm(); setActiveTab("projects"); }}
                        style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 6, padding: "8px 20px", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                        Cancel
                      </button>
                      <button onClick={handleSaveProject}
                        style={{ background: "linear-gradient(135deg, #2563eb, #29ABE2)", border: "none", borderRadius: 6, padding: "8px 20px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                        {isEditingProject ? "Save Changes" : "Save Project"}
                      </button>
                    </div>
                  </div>

                  {/* Banner messages */}
                  {formSuccessMessage && (
                    <div style={{ background: "#ecfdf5", border: "1px solid #10b981", color: "#065f46", padding: 12, borderRadius: 6, fontSize: 13, fontWeight: "bold", margin: "20px 0" }}>
                      ✓ {formSuccessMessage}
                    </div>
                  )}
                  {formErrorMessage && (
                    <div style={{ background: "#fef2f2", border: "1px solid #ef4444", color: "#991b1b", padding: 12, borderRadius: 6, fontSize: 13, fontWeight: "bold", margin: "20px 0" }}>
                      ⚠️ Error: {formErrorMessage}
                    </div>
                  )}

                  {/* Main Grid: 2 columns */}
                  <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 32, marginTop: 24 }}>
                    
                    {/* Left Column: Project Information */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                      <h3 style={sectionTitleStyle}>Project Information</h3>
                      
                      <div style={fieldGroupStyle}>
                        <label style={fieldLabelStyle}>Project Name *</label>
                        <input type="text" value={projName} onChange={e => setProjName(e.target.value)} style={lightInputStyle} placeholder="Enter project name" />
                      </div>

                      <div style={fieldGroupStyle}>
                        <label style={fieldLabelStyle}>Client *</label>
                        <input type="text" value={projClient} onChange={e => setProjClient(e.target.value)} style={lightInputStyle} placeholder="Enter client name" />
                      </div>

                      <div style={fieldGroupStyle}>
                        <label style={fieldLabelStyle}>Project Code *</label>
                        <input type="text" value={projCode} onChange={e => setProjCode(e.target.value)} style={lightInputStyle} placeholder="e.g. TRV-2026-001" />
                      </div>

                      <div style={fieldGroupStyle}>
                        <label style={fieldLabelStyle}>Project Manager *</label>
                        <select value={projManager} onChange={e => setProjManager(e.target.value)} style={lightSelectStyle}>
                          <option value="Admin">Admin</option>
                          <option value="Jibin Jose">Jibin Jose</option>
                          <option value="Rahul Raj">Rahul Raj</option>
                        </select>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div style={fieldGroupStyle}>
                          <label style={fieldLabelStyle}>Start Date *</label>
                          <input type="date" value={projStartDate} onChange={e => setProjStartDate(e.target.value)} style={lightInputStyle} />
                        </div>
                        <div style={fieldGroupStyle}>
                          <label style={fieldLabelStyle}>End Date *</label>
                          <input type="date" value={projEndDate} onChange={e => setProjEndDate(e.target.value)} style={lightInputStyle} />
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div style={fieldGroupStyle}>
                          <label style={fieldLabelStyle}>Priority *</label>
                          <select value={projPriority} onChange={e => setProjPriority(e.target.value)} style={lightSelectStyle}>
                            <option value="Low">🟢 Low</option>
                            <option value="Medium">🟡 Medium</option>
                            <option value="High">🟠 High</option>
                            <option value="Critical">🔴 Critical</option>
                          </select>
                        </div>

                        <div style={fieldGroupStyle}>
                          <label style={fieldLabelStyle}>Status *</label>
                          <select value={projStatus} onChange={e => setProjStatus(e.target.value)} style={lightSelectStyle}>
                            <option value="Planning">Planning</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Testing">Testing</option>
                            <option value="Completed">Completed</option>
                            <option value="Maintenance">Maintenance</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Project Settings */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                      <h3 style={sectionTitleStyle}>Project Settings</h3>

                      <div style={fieldGroupStyle}>
                        <label style={fieldLabelStyle}>Project Type</label>
                        <div style={{ display: "flex", gap: 24, marginTop: 4 }}>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#475569", fontWeight: 600, cursor: "pointer" }}>
                            <input type="radio" name="projectType" value="Fixed Price" checked={projType === "Fixed Price"} onChange={e => setProjType(e.target.value)} />
                            Fixed Price
                          </label>
                          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#475569", fontWeight: 600, cursor: "pointer" }}>
                            <input type="radio" name="projectType" value="Time & Material" checked={projType === "Time & Material"} onChange={e => setProjType(e.target.value)} />
                            Time & Material
                          </label>
                        </div>
                      </div>

                      <div style={fieldGroupStyle}>
                        <label style={fieldLabelStyle}>Budget (₹)</label>
                        <input type="number" value={projBudget} onChange={e => setProjBudget(e.target.value)} style={lightInputStyle} placeholder="Enter budget amount" />
                      </div>

                      <div style={fieldGroupStyle}>
                        <label style={fieldLabelStyle}>Currency</label>
                        <select value={projCurrency} onChange={e => setProjCurrency(e.target.value)} style={lightSelectStyle}>
                          <option value="INR (₹)">INR (₹)</option>
                          <option value="USD ($)">USD ($)</option>
                        </select>
                      </div>

                      <div style={fieldGroupStyle}>
                        <label style={fieldLabelStyle}>Estimated Hours</label>
                        <div style={{ position: "relative" }}>
                          <input type="number" value={projEstHours} onChange={e => setProjEstHours(e.target.value)} style={lightInputStyle} placeholder="e.g. 320" />
                          <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>hrs</span>
                        </div>
                      </div>

                      <div style={fieldGroupStyle}>
                        <label style={fieldLabelStyle}>Department</label>
                        <select value={projDepartment} onChange={e => setProjDepartment(e.target.value)} style={lightSelectStyle}>
                          <option value="Select Department">Select Department</option>
                          <option value="Web Development">Web Development</option>
                          <option value="Mobile Development">Mobile Development</option>
                          <option value="Designing">Designing</option>
                          <option value="Quality Assurance">Quality Assurance</option>
                        </select>
                      </div>

                      {/* Tag Input */}
                      <div style={fieldGroupStyle}>
                        <label style={fieldLabelStyle}>Tags</label>
                        <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleTagKeyPress} style={lightInputStyle} placeholder="Enter tags and press Enter" />
                        
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                          {projTags.map((tag, idx) => (
                            <span key={idx} style={{ background: "#eff6ff", color: "#1d4ed8", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                              {tag}
                              <button type="button" onClick={() => removeTag(idx)} style={{ background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontWeight: "bold", fontSize: 9 }}>✕</button>
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Project Image Placeholder */}
                      <div style={fieldGroupStyle}>
                        <label style={fieldLabelStyle}>Project Image (Optional)</label>
                        <div style={{ border: "2px dashed #cbd5e1", borderRadius: 8, padding: "20px", textAlign: "center", cursor: "pointer", background: "#f8fafc", transition: "border 0.2s" }}>
                          <div style={{ fontSize: 24, color: "#94a3b8" }}>☁️</div>
                          <div style={{ fontSize: 12, color: "#475569", fontWeight: 700, marginTop: 8 }}>Click to upload or drag and drop</div>
                          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>PNG, JPG up to 5MB</div>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Bottom: Project Members Section */}
                  <div style={{ borderTop: "1px solid #e2e8f0", marginTop: 32, paddingTop: 28 }}>
                    <h3 style={sectionTitleStyle}>Project Members</h3>
                    
                    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 2fr", gap: 32, marginTop: 16 }}>
                      
                      <div style={fieldGroupStyle}>
                        <label style={fieldLabelStyle}>Add Team Members</label>
                        <div style={{ display: "flex", gap: 8 }}>
                          <select value={memberSearchText} onChange={e => addTeamMember(e.target.value, "Developer")} style={lightSelectStyle}>
                            <option value="">Select member to add...</option>
                            {developers.map(name => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label style={fieldLabelStyle}>Selected Members</label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8 }}>
                          {selectedMembers.map((member, idx) => (
                            <div key={idx} style={{ background: "#f1f5f9", borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", gap: 10, border: "1px solid #e2e8f0" }}>
                              <UserAvatar name={member.name} size={28} />
                              <div>
                                <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{member.name}</div>
                                <div style={{ fontSize: 10, color: "#64748b" }}>{member.role}</div>
                              </div>
                              <button type="button" onClick={() => removeTeamMember(idx)} 
                                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 12, padding: "0 4px", fontWeight: "bold" }}>
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                        <button type="button" onClick={() => addTeamMember("Jibin Jose", "Manager")}
                          style={{ border: "none", background: "none", color: "#2563eb", fontSize: 12, fontWeight: 700, cursor: "pointer", marginTop: 12, padding: 0 }}>
                          + Add More Members
                        </button>
                      </div>

                    </div>
                  </div>

                </div>
              )}

              {/* Tab 5: Create Task (Premium Light-Mode UI matching the task image) */}
              {activeTab === "add_task" && (
                <div style={{ background: "#ffffff", borderRadius: 12, padding: 32, boxShadow: "0 10px 30px rgba(0,0,0,0.03)", border: "1px solid #e2e8f0" }}>
                  
                  {/* Light Header Title */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <button onClick={() => setActiveTab("tasks")} 
                        style={{ border: "none", background: "none", cursor: "pointer", fontSize: 20, color: "#1e293b", padding: "0 4px" }}
                        title="Back">
                        ←
                      </button>
                      <div>
                        <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", margin: 0 }}>Create New Task</h2>
                        {/* Breadcrumbs */}
                        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, fontWeight: 600 }}>
                          Dashboard &nbsp;&gt;&nbsp; Tasks &nbsp;&gt;&nbsp; <span style={{ color: "#64748b" }}>Create Task</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Top Action Buttons */}
                    <div style={{ display: "flex", gap: 12 }}>
                      <button onClick={() => { resetTaskForm(); setActiveTab("tasks"); }}
                        style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 6, padding: "8px 20px", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                        Cancel
                      </button>
                      <button onClick={handleSaveTask}
                        style={{ background: "#2563eb", border: "none", borderRadius: 6, padding: "8px 20px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 10px rgba(37,99,235,0.2)" }}>
                        Save Task
                      </button>
                    </div>
                  </div>

                  {/* Banner messages */}
                  {formSuccessMessage && (
                    <div style={{ background: "#ecfdf5", border: "1px solid #10b981", color: "#065f46", padding: 12, borderRadius: 6, fontSize: 13, fontWeight: "bold", margin: "20px 0" }}>
                      ✓ {formSuccessMessage}
                    </div>
                  )}
                  {formErrorMessage && (
                    <div style={{ background: "#fef2f2", border: "1px solid #ef4444", color: "#991b1b", padding: 12, borderRadius: 6, fontSize: 13, fontWeight: "bold", margin: "20px 0" }}>
                      ⚠️ Error: {formErrorMessage}
                    </div>
                  )}

                  {/* Main Grid: 2 columns */}
                  <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 32, marginTop: 24 }}>
                    
                    {/* Left Column: Task Details */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                      <h3 style={sectionTitleStyle}>Task Details</h3>
                      
                      <div style={fieldGroupStyle}>
                        <label style={fieldLabelStyle}>Task Name *</label>
                        <input type="text" value={taskName} onChange={e => setTaskName(e.target.value)} style={lightInputStyle} placeholder="Enter task name" />
                      </div>

                      <div style={fieldGroupStyle}>
                        <label style={fieldLabelStyle}>Project *</label>
                        <select value={taskProjectId} onChange={e => setTaskProjectId(e.target.value)} style={lightSelectStyle}>
                          <option value="">Select Project</option>
                          {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      <div style={fieldGroupStyle}>
                        <label style={fieldLabelStyle}>Milestone</label>
                        <select value={taskMilestone} onChange={e => setTaskMilestone(e.target.value)} style={lightSelectStyle}>
                          <option value="Select Milestone (Optional)">Select Milestone (Optional)</option>
                          <option value="Sprint 1">Sprint 1</option>
                          <option value="Sprint 2">Sprint 2</option>
                          <option value="MVP Release">MVP Release</option>
                        </select>
                      </div>

                      {/* Task Description Textarea with simulated rich toolbar */}
                      <div style={fieldGroupStyle}>
                        <label style={fieldLabelStyle}>Description</label>
                        <div style={{ border: "1px solid #cbd5e1", borderRadius: 6, overflow: "hidden" }}>
                          {/* Rich editor header toolbar */}
                          <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "8px 12px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", fontSize: 12, color: "#64748b" }}>
                            <span style={{ fontWeight: "bold", cursor: "pointer" }}>Normal</span>
                            <span style={{ fontWeight: "bold", cursor: "pointer" }}>B</span>
                            <span style={{ fontStyle: "italic", cursor: "pointer" }}>I</span>
                            <span style={{ textDecoration: "underline", cursor: "pointer" }}>U</span>
                            <span style={{ cursor: "pointer" }}>📋</span>
                            <span style={{ cursor: "pointer" }}>•—</span>
                            <span style={{ cursor: "pointer" }}>🔢</span>
                            <span style={{ cursor: "pointer" }}>📎</span>
                          </div>
                          <textarea value={taskDescription} onChange={e => setTaskDescription(e.target.value)} style={{ ...lightInputStyle, border: "none", borderRadius: 0, minHeight: 120, resize: "vertical" }} placeholder="Enter task description..." />
                        </div>
                      </div>

                      {/* Checklist */}
                      <div style={fieldGroupStyle}>
                        <label style={fieldLabelStyle}>Checklist (Optional)</label>
                        <div style={{ display: "flex", gap: 10 }}>
                          <input type="text" value={taskChecklistInput} onChange={e => setTaskChecklistInput(e.target.value)} style={lightInputStyle} placeholder="Add checklist item" />
                          <button type="button" onClick={addChecklistItem}
                            style={{ background: "none", border: "none", color: "#2563eb", cursor: "pointer", fontSize: 13, fontWeight: 700, padding: "0 8px" }}>
                            + Add item
                          </button>
                        </div>
                        {taskChecklist.length > 0 && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                            {taskChecklist.map((item, idx) => (
                              <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 12px", background: "#f8fafc", borderRadius: 6, border: "1px solid #e2e8f0" }}>
                                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: item.checked ? "#94a3b8" : "#334155", textDecoration: item.checked ? "line-through" : "none", cursor: "pointer" }}>
                                  <input type="checkbox" checked={item.checked} onChange={() => toggleChecklistItem(idx)} />
                                  {item.text}
                                </label>
                                <button type="button" onClick={() => removeChecklistItem(idx)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 12 }}>✕</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Attachments drag & drop placeholder */}
                      <div style={fieldGroupStyle}>
                        <label style={fieldLabelStyle}>Attachments (Optional)</label>
                        <div style={{ border: "2px dashed #cbd5e1", borderRadius: 8, padding: "24px", textAlign: "center", cursor: "pointer", background: "#f8fafc" }}>
                          <div style={{ fontSize: 24, color: "#94a3b8" }}>☁️</div>
                          <div style={{ fontSize: 12, color: "#475569", fontWeight: 700, marginTop: 8 }}>Drag & drop files here or <span style={{ color: "#2563eb" }}>click to upload</span></div>
                          <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>Max file size: 20MB</div>
                        </div>
                      </div>

                    </div>

                    {/* Right Column */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                      
                      <div style={fieldGroupStyle}>
                        <label style={fieldLabelStyle}>Assigned To *</label>
                        <select value={taskAssignedTo} onChange={e => setTaskAssignedTo(e.target.value)} style={lightSelectStyle}>
                          <option value="">Select Team Member</option>
                          {teamMembers.length > 0 ? (
                            teamMembers.map(member => (
                              <option key={member.id} value={member.name}>{member.name}</option>
                            ))
                          ) : (
                            developers.map(name => (
                              <option key={name} value={name}>{name}</option>
                            ))
                          )}
                        </select>
                      </div>

                      <div style={fieldGroupStyle}>
                        <label style={fieldLabelStyle}>Assign By *</label>
                        <select value={taskAssignBy} onChange={e => setTaskAssignBy(e.target.value)} style={lightSelectStyle}>
                          <option value={localStorage.getItem("admin_logged_in_name") || "Jibin Jose"}>
                            {localStorage.getItem("admin_logged_in_name") || "Jibin Jose"}
                          </option>
                        </select>
                      </div>

                      <div style={fieldGroupStyle}>
                        <label style={fieldLabelStyle}>Priority *</label>
                        <select value={taskPriority} onChange={e => setTaskPriority(e.target.value)} style={lightSelectStyle}>
                          <option value="Low">🟢 Low</option>
                          <option value="Medium">🟡 Medium</option>
                          <option value="High">🟠 High</option>
                          <option value="Critical">🔴 Critical</option>
                        </select>
                      </div>

                      <div style={fieldGroupStyle}>
                        <label style={fieldLabelStyle}>Due Date *</label>
                        <input type="date" value={taskDueDate} onChange={e => setTaskDueDate(e.target.value)} style={lightInputStyle} />
                      </div>

                      <div style={fieldGroupStyle}>
                        <label style={fieldLabelStyle}>Estimated Hours</label>
                        <div style={{ position: "relative" }}>
                          <input type="number" value={taskEstHours} onChange={e => setTaskEstHours(e.target.value)} style={lightInputStyle} placeholder="e.g. 8" />
                          <span style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "#94a3b8", fontWeight: 700 }}>hrs</span>
                        </div>
                      </div>

                      <div style={fieldGroupStyle}>
                        <label style={fieldLabelStyle}>Task Status</label>
                        <select value={taskStatus} onChange={e => setTaskStatus(e.target.value)} style={lightSelectStyle}>
                          <option value="To Do">🔵 To Do</option>
                          <option value="In Progress">🟢 In Progress</option>
                          <option value="Testing">Purple Testing</option>
                          <option value="Completed">⚪ Completed</option>
                        </select>
                      </div>

                      {/* Tag Input */}
                      <div style={fieldGroupStyle}>
                        <label style={fieldLabelStyle}>Tags (Optional)</label>
                        <input type="text" value={taskTagInput} onChange={e => setTaskTagInput(e.target.value)} onKeyDown={handleTaskTagKeyPress} style={lightInputStyle} placeholder="Enter tags and press Enter" />
                        
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                          {taskTags.map((tag, idx) => (
                            <span key={idx} style={{ background: "#eff6ff", color: "#1d4ed8", padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
                              {tag}
                              <button type="button" onClick={() => removeTaskTag(idx)} style={{ background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontWeight: "bold", fontSize: 9 }}>✕</button>
                            </span>
                          ))}
                        </div>
                      </div>

                    </div>
                  </div>

                </div>
              )}

              {/* Tab 6: Project Details View (Premium Light-Mode UI matching the details image exactly) */}
              {activeTab === "project_details" && selectedProject && (() => {
                const details = parseProjectRemarks(selectedProject.remarks);
                
                // Dynamic calculations for overall task progress
                const projectTasks = kanbanTasks.filter(t => String(t.projectId) === String(selectedProject.id));
                const completedCount = projectTasks.filter(t => t.column === "completed").length;
                const inProgressCount = projectTasks.filter(t => t.column === "inprogress").length;
                const toDoCount = projectTasks.filter(t => t.column === "todo" || t.column === "backlog" || t.column === "testing").length;
                const totalTasksCount = projectTasks.length;
                const progressPct = totalTasksCount ? Math.round((completedCount / totalTasksCount) * 100) : 0;

                // Find logged hours for this project from actual timesheets
                const projectTimesheets = timesheets.filter(ts => String(ts.project) === String(selectedProject.id));
                const totalLoggedHours = projectTimesheets.reduce((sum, ts) => sum + (parseFloat(ts.total_hours) || 0), 0);

                const priorityDotColor = {
                  Low: "#10b981",
                  Medium: "#eab308",
                  High: "#f97316",
                  Critical: "#ef4444"
                }[details.priority] || "#10b981";

                return (
                  <div style={{ background: "#f8fafc", color: "#1e293b", minHeight: "100vh" }}>
                    
                    {/* Header bar */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <button onClick={() => { setActiveTab("projects"); setSelectedProject(null); }} 
                          style={{ border: "none", background: "none", cursor: "pointer", fontSize: 20, color: "#0f172a", padding: "0 4px" }}
                          title="Back">
                          ←
                        </button>
                        <div>
                          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", margin: 0 }}>Project Details</h2>
                          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, fontWeight: 600 }}>
                            Dashboard &nbsp;&gt;&nbsp; Projects &nbsp;&gt;&nbsp; <span style={{ color: "#64748b" }}>{selectedProject.name}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ display: "flex", gap: 12 }}>
                        <button onClick={() => handleEditProjectClick(selectedProject)}
                          style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 6, padding: "8px 16px", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                          Edit Project
                        </button>
                        <button style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 6, padding: "8px 16px", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                          More ▾
                        </button>
                      </div>
                    </div>

                    {/* Horizontal Chevron Progress Bar */}
                    <div style={{ display: "flex", gap: 3, background: "#f1f5f9", padding: "8px 12px", borderRadius: 8, marginBottom: 24, overflowX: "hidden", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.05)", border: "1px solid #cbd5e1" }}>
                      {PROJECT_STAGES.map((stage, idx) => {
                        const activeIdx = PROJECT_STAGES.indexOf(details.currentStage);
                        const isActive = stage === details.currentStage;
                        const isCompleted = idx < activeIdx;
                        
                        let clipPathVal = "polygon(0% 0%, calc(100% - 10px) 0%, 100% 50%, calc(100% - 10px) 100%, 0% 100%, 10px 50%)";
                        if (idx === 0) {
                          clipPathVal = "polygon(0% 0%, calc(100% - 10px) 0%, 100% 50%, calc(100% - 10px) 100%, 0% 100%)";
                        } else if (idx === PROJECT_STAGES.length - 1) {
                          clipPathVal = "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 10px 50%)";
                        }

                        let bg = "#e2e8f0";
                        let fg = "#64748b";
                        if (isActive) {
                          bg = "#d97706";
                          fg = "#ffffff";
                        } else if (isCompleted) {
                          bg = "#eff6ff";
                          fg = "#1e40af";
                        }

                        return (
                          <button key={stage} onClick={() => handleUpdateProjectStage(stage)}
                            style={{
                              flex: 1, minWidth: 50, height: 42, border: "none", background: bg, color: fg,
                              fontSize: 7.5, fontWeight: 800, textTransform: "uppercase",
                              clipPath: clipPathVal, display: "flex", alignItems: "center", justifyContent: "center",
                              textAlign: "center", cursor: "pointer", transition: "all 0.15s", padding: "0 8px 0 12px"
                            }}
                            title={`Switch to ${stage}`}>
                            {stage}
                          </button>
                        );
                      })}
                    </div>

                    {/* Hero Header Card Container */}
                    <div style={{ background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 24, marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.02)" }}>
                      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                        <div style={{ width: 48, height: 48, borderRadius: 8, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
                          📂
                        </div>
                        
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <h1 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", margin: 0 }}>{selectedProject.name}</h1>
                            <span style={{ background: "#ecfdf5", color: "#059669", padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                              ● Active
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, fontWeight: 700 }}>{details.code}</div>
                          <p style={{ fontSize: 13, color: "#475569", marginTop: 8, lineHeight: 1.5 }}>{details.description || "No description provided for this project."}</p>
                        </div>
                      </div>

                      {/* Details row cards */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 16, marginTop: 24, borderTop: "1px solid #f1f5f9", paddingTop: 20 }}>
                        <div>
                          <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Client</div>
                          <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 700, marginTop: 4 }}>{details.client}</div>
                        </div>

                        <div>
                          <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Project Manager</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                            <UserAvatar name={details.manager} size={20} />
                            <span style={{ fontSize: 13, color: "#0f172a", fontWeight: 700 }}>{details.manager}</span>
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Start Date</div>
                          <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 700, marginTop: 4 }}>{formatDateStr(details.startDate)}</div>
                        </div>

                        <div>
                          <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>End Date</div>
                          <div style={{ fontSize: 13, color: "#0f172a", fontWeight: 700, marginTop: 4 }}>{formatDateStr(details.endDate)}</div>
                        </div>

                        <div>
                          <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Priority</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#0f172a", fontWeight: 700, marginTop: 4 }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: priorityDotColor }} />
                            {details.priority}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Status</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#0f172a", fontWeight: 700, marginTop: 4 }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6" }} />
                            {selectedProject.mode === "PROD" ? "Production" : selectedProject.mode === "DEV" ? "Development" : "Maintenance"}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Sub navigation tabs bar */}
                    <div style={{ display: "flex", gap: 24, borderBottom: "1px solid #e2e8f0", marginBottom: 24, overflowX: "auto" }}>
                      {[
                        { key: "Overview", label: "Overview" },
                        { key: "Members", label: `Members (${details.members.length || 0})` },
                        { key: "Milestones", label: "Milestones (4)" },
                        { key: "Tasks", label: `Tasks (${totalTasksCount})` },
                        { key: "Files", label: "Files (0)" },
                        { key: "Time Logs", label: "Time Logs" },
                        { key: "Issues", label: "Issues (0)" },
                        { key: "Notes", label: "Notes" },
                        { key: "Billing", label: "Billing" }
                      ].map((tab) => {
                        const active = detailsActiveTab === tab.key;
                        return (
                          <button key={tab.key} onClick={() => setDetailsActiveTab(tab.key)}
                            style={{
                              background: "none", border: "none", borderBottom: active ? "2.5px solid #2563eb" : "2.5px solid transparent",
                              color: active ? "#2563eb" : "#64748b", padding: "10px 4px", fontSize: 13, fontWeight: active ? 800 : 600, cursor: "pointer",
                              whiteSpace: "nowrap"
                            }}>
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Main contents switcher */}
                    {detailsActiveTab === "Overview" && (
                      <div>
                        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 1.2fr", gap: 24 }}>
                          
                          {/* Overview Box Column 1 */}
                          <div style={{ background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                            <h3 style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", borderBottom: "1px solid #f1f5f9", paddingBottom: 8, margin: 0 }}>Project Overview</h3>
                            
                            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "12px 6px", fontSize: 12 }}>
                              <span style={{ color: "#64748b", fontWeight: 600 }}>Project Type</span>
                              <span style={{ color: "#0f172a", fontWeight: 700 }}>Fixed bid</span>

                              <span style={{ color: "#64748b", fontWeight: 600 }}>Budget</span>
                              <span style={{ color: "#0f172a", fontWeight: 700 }}>{details.budget}</span>

                              <span style={{ color: "#64748b", fontWeight: 600 }}>Estimated Hours</span>
                              <span style={{ color: "#0f172a", fontWeight: 700 }}>{details.estimatedHours} hrs</span>

                              <span style={{ color: "#64748b", fontWeight: 600 }}>Total Logged Hours</span>
                              <span style={{ color: "#2563eb", fontWeight: 700 }}>{totalLoggedHours} hrs</span>

                              <span style={{ color: "#64748b", fontWeight: 600 }}>Department</span>
                              <span style={{ color: "#0f172a", fontWeight: 700 }}>{details.department}</span>

                              <span style={{ color: "#64748b", fontWeight: 600 }}>Tags</span>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                {details.tags.length > 0 ? (
                                  details.tags.map(t => (
                                    <span key={t} style={{ background: "#f1f5f9", color: "#475569", padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 700 }}>{t}</span>
                                  ))
                                ) : "—"}
                              </div>
                            </div>

                            <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 14, marginTop: 6 }}>
                              <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", marginBottom: 6 }}>Description</div>
                              <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.6, margin: 0 }}>
                                {details.description || "No project description provided."}
                              </p>
                            </div>
                          </div>

                          {/* Gauge Chart Column 2 */}
                          <div style={{ background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 24, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                            <h3 style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", width: "100%", borderBottom: "1px solid #f1f5f9", paddingBottom: 8, margin: "0 0 16px 0" }}>Progress</h3>
                            
                            <div style={{ position: "relative", width: 120, height: 120, marginBottom: 20 }}>
                              <svg width="120" height="120" viewBox="0 0 36 36" style={{ transform: "rotate(-90deg)" }}>
                                <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#f1f5f9" strokeWidth="3" />
                                <circle cx="18" cy="18" r="15.915" fill="transparent" stroke="#10b981" strokeWidth="3"
                                  strokeDasharray={`${progressPct} ${100 - progressPct}`} strokeDashoffset="0" />
                              </svg>
                              <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                                <span style={{ fontSize: 20, fontWeight: 800, color: "#0f172a" }}>{progressPct}%</span>
                                <span style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Overall</span>
                              </div>
                            </div>

                            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 10, fontSize: 12 }}>
                              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
                                <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981" }} /> Completed</span>
                                <span style={{ color: "#475569" }}>{completedCount} ({totalTasksCount ? Math.round((completedCount / totalTasksCount) * 100) : 0}%)</span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
                                <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#eab308" }} /> In Progress</span>
                                <span style={{ color: "#475569" }}>{inProgressCount} ({totalTasksCount ? Math.round((inProgressCount / totalTasksCount) * 100) : 0}%)</span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 600 }}>
                                <span style={{ display: "flex", alignItems: "center", gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#cbd5e1" }} /> To Do</span>
                                <span style={{ color: "#475569" }}>{toDoCount} ({totalTasksCount ? Math.round((toDoCount / totalTasksCount) * 100) : 0}%)</span>
                              </div>
                            </div>
                          </div>

                          {/* Milestones Column 3 */}
                          <div style={{ background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 24, display: "flex", flexDirection: "column" }}>
                            <h3 style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", borderBottom: "1px solid #f1f5f9", paddingBottom: 8, margin: "0 0 16px 0" }}>Recent Milestones</h3>
                            
                            <div style={{ display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
                              <div style={{ display: "flex", gap: 12, position: "relative" }}>
                                <span style={{ position: "absolute", left: 5, top: 12, bottom: -20, width: 1.5, background: "#10b981" }} />
                                <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#10b981", marginTop: 4, zIndex: 1 }} />
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Phase 1 - Planning</div>
                                  <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>Completed - 10 May 2026</div>
                                </div>
                              </div>

                              <div style={{ display: "flex", gap: 12, position: "relative" }}>
                                <span style={{ position: "absolute", left: 5, top: 12, bottom: -20, width: 1.5, background: "#10b981" }} />
                                <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#10b981", marginTop: 4, zIndex: 1 }} />
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Phase 2 - Design</div>
                                  <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>Completed - 25 May 2026</div>
                                </div>
                              </div>

                              <div style={{ display: "flex", gap: 12, position: "relative" }}>
                                <span style={{ position: "absolute", left: 5, top: 12, bottom: -20, width: 1.5, background: "#e2e8f0" }} />
                                <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#eab308", marginTop: 4, zIndex: 1 }} />
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Phase 3 - Development</div>
                                  <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>In Progress - 30 Aug 2026</div>
                                </div>
                              </div>

                              <div style={{ display: "flex", gap: 12 }}>
                                <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#cbd5e1", marginTop: 4, zIndex: 1 }} />
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 800, color: "#64748b" }}>Phase 4 - Testing</div>
                                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>Pending</div>
                                </div>
                              </div>
                            </div>

                            <span style={{ color: "#2563eb", fontSize: 12, fontWeight: 700, cursor: "pointer", marginTop: 16 }}>View all milestones</span>
                          </div>

                        </div>

                        {/* Bottom: Project Members Section */}
                        <div style={{ background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 24, marginTop: 24 }}>
                          <h3 style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", borderBottom: "1px solid #f1f5f9", paddingBottom: 8, margin: "0 0 16px 0" }}>Project Members</h3>
                          
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
                            {details.members.length > 0 ? (
                              details.members.map((member, idx) => (
                                <div key={idx} style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 16px", display: "flex", alignItems: "center", gap: 10, border: "1px solid #e2e8f0", minWidth: 160 }}>
                                  <UserAvatar name={member.name} size={28} />
                                  <div>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{member.name}</div>
                                    <div style={{ fontSize: 10, color: "#64748b" }}>{member.role}</div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div style={{ fontSize: 12, color: "#94a3b8" }}>No specific members assigned yet.</div>
                            )}
                            
                            <div onClick={() => setShowAddMemberModal(true)}
                              style={{ border: "1.5px dashed #cbd5e1", borderRadius: 8, padding: "8px 16px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: "#2563eb", cursor: "pointer", minWidth: 140 }}>
                              <span style={{ fontSize: 16, fontWeight: "bold" }}>+</span>
                              <span style={{ fontSize: 12, fontWeight: 700 }}>Add Member</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {detailsActiveTab === "Members" && (
                      <div style={{ background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 24 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", borderBottom: "1px solid #f1f5f9", paddingBottom: 8, margin: "0 0 16px 0" }}>Project Members</h3>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 16 }}>
                          {details.members.length > 0 ? (
                            details.members.map((member, idx) => (
                              <div key={idx} style={{ background: "#f8fafc", borderRadius: 8, padding: "12px 20px", display: "flex", alignItems: "center", gap: 12, border: "1px solid #e2e8f0", minWidth: 200 }}>
                                <UserAvatar name={member.name} size={36} />
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{member.name}</div>
                                  <div style={{ fontSize: 11, color: "#64748b" }}>{member.role}</div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div style={{ fontSize: 12, color: "#94a3b8" }}>No specific members assigned yet.</div>
                          )}
                          <div onClick={() => setShowAddMemberModal(true)}
                            style={{ border: "1.5px dashed #cbd5e1", borderRadius: 8, padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: "#2563eb", cursor: "pointer", minWidth: 160 }}>
                            <span style={{ fontSize: 16, fontWeight: "bold" }}>+</span>
                            <span style={{ fontSize: 13, fontWeight: 700 }}>Add Member</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {detailsActiveTab === "Milestones" && (
                      <div style={{ background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 24 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", borderBottom: "1px solid #f1f5f9", paddingBottom: 8, margin: "0 0 16px 0" }}>Project Milestones</h3>
                        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
                          {[
                            { name: "Phase 1 - Planning", status: "Completed", date: "10 May 2026", color: "#10b981" },
                            { name: "Phase 2 - Design", status: "Completed", date: "25 May 2026", color: "#10b981" },
                            { name: "Phase 3 - Development", status: "In Progress", date: "30 Aug 2026", color: "#eab308" },
                            { name: "Phase 4 - Testing", status: "Pending", date: "—", color: "#cbd5e1" }
                          ].map((milestone, idx) => (
                            <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <span style={{ width: 10, height: 10, borderRadius: "50%", background: milestone.color }} />
                                <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>{milestone.name}</span>
                              </div>
                              <div style={{ display: "flex", gap: 24, fontSize: 12 }}>
                                <span style={{ color: "#64748b" }}>Date: {milestone.date}</span>
                                <span style={{ fontWeight: 700, color: milestone.color }}>{milestone.status}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {detailsActiveTab === "Tasks" && (
                      <div style={{ background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 24 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", borderBottom: "1px solid #f1f5f9", paddingBottom: 8, margin: "0 0 16px 0" }}>Project Tasks</h3>
                        {projectTasks.length === 0 ? (
                          <div style={{ textAlign: "center", color: "#94a3b8", padding: 24 }}>No tasks defined for this project.</div>
                        ) : (
                          <div style={{ overflowX: "auto", marginTop: 16 }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                              <thead>
                                <tr style={{ borderBottom: "1px solid #e2e8f0", textAlign: "left", color: "#64748b" }}>
                                  <th style={{ padding: "12px 8px" }}>Task Name</th>
                                  <th style={{ padding: "12px 8px" }}>Assigned To</th>
                                  <th style={{ padding: "12px 8px" }}>Priority</th>
                                  <th style={{ padding: "12px 8px" }}>Status</th>
                                  <th style={{ padding: "12px 8px" }}>Est. Hours</th>
                                  <th style={{ padding: "12px 8px" }}>Due Date</th>
                                </tr>
                              </thead>
                              <tbody>
                                {projectTasks.map(t => (
                                  <tr key={t.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                    <td onClick={() => handleOpenTaskDetails(t)} style={{ padding: "12px 8px", fontWeight: 700, color: "#2563eb", cursor: "pointer", textDecoration: "underline" }}>{t.title}</td>
                                    <td style={{ padding: "12px 8px" }}>{t.developer}</td>
                                    <td style={{ padding: "12px 8px" }}>
                                      <span style={{
                                        background: t.rawTask?.priority === "Critical" ? "#fef2f2" : "#f7fee7",
                                        color: t.rawTask?.priority === "Critical" ? "#b91c1c" : "#4d7c0f",
                                        padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700
                                      }}>
                                        {t.rawTask?.priority || "Low"}
                                      </span>
                                    </td>
                                    <td style={{ padding: "12px 8px" }}>
                                      <span style={{
                                        background: "#eff6ff", color: "#1d4ed8",
                                        padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700
                                      }}>
                                        {t.rawTask?.status || "To Do"}
                                      </span>
                                    </td>
                                    <td style={{ padding: "12px 8px" }}>{t.hours} hrs</td>
                                    <td style={{ padding: "12px 8px" }}>{formatDateStr(t.date)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {detailsActiveTab === "Files" && (
                      <div style={{ background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 48, textAlign: "center" }}>
                        <span style={{ fontSize: 32 }}>📁</span>
                        <h3 style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginTop: 12, marginBottom: 6 }}>No Files Uploaded</h3>
                        <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 16px 0" }}>Drag and drop files here to upload project documents.</p>
                        <button style={{ background: "linear-gradient(135deg, #2563eb, #29ABE2)", border: "none", borderRadius: 6, padding: "8px 16px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          Upload File
                        </button>
                      </div>
                    )}

                    {detailsActiveTab === "Time Logs" && (
                      <div style={{ background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 24 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", borderBottom: "1px solid #f1f5f9", paddingBottom: 8, margin: "0 0 16px 0" }}>Logged Timesheets</h3>
                        {projectTimesheets.length === 0 ? (
                          <div style={{ textAlign: "center", color: "#94a3b8", padding: 24 }}>No timesheets submitted for this project yet.</div>
                        ) : (
                          <div style={{ overflowX: "auto", marginTop: 16 }}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                              <thead>
                                <tr style={{ borderBottom: "1px solid #e2e8f0", textAlign: "left", color: "#64748b" }}>
                                  <th style={{ padding: "12px 8px" }}>Date</th>
                                  <th style={{ padding: "12px 8px" }}>Developer</th>
                                  <th style={{ padding: "12px 8px" }}>Hours</th>
                                  <th style={{ padding: "12px 8px" }}>Task Summary</th>
                                </tr>
                              </thead>
                              <tbody>
                                {projectTimesheets.map(ts => (
                                  <tr key={ts.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                                    <td style={{ padding: "12px 8px" }}>{formatDateStr(ts.date)}</td>
                                    <td style={{ padding: "12px 8px", fontWeight: 700 }}>{ts.employee_name}</td>
                                    <td style={{ padding: "12px 8px", color: "#2563eb", fontWeight: 700 }}>{ts.total_hours} hrs</td>
                                    <td style={{ padding: "12px 8px" }}>
                                      {ts.tasks.map((task, idx) => (
                                        <div key={idx} style={{ color: "#475569" }}>• {task.description} ({task.hours}h)</div>
                                      ))}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {detailsActiveTab === "Issues" && (
                      <div style={{ background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 48, textAlign: "center" }}>
                        <span style={{ fontSize: 32 }}>⚠️</span>
                        <h3 style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", marginTop: 12, marginBottom: 6 }}>No Active Issues</h3>
                        <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 16px 0" }}>Create an issue if you encounter bugs or blockers.</p>
                        <button style={{ background: "linear-gradient(135deg, #2563eb, #29ABE2)", border: "none", borderRadius: 6, padding: "8px 16px", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          Create Issue
                        </button>
                      </div>
                    )}

                    {detailsActiveTab === "Notes" && (
                      <div style={{ background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 24 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", borderBottom: "1px solid #f1f5f9", paddingBottom: 8, margin: "0 0 16px 0" }}>Project Documentation & Notes</h3>
                        <textarea placeholder="Write project notes here..." defaultValue={details.description}
                          style={{ width: "100%", minHeight: 180, border: "1px solid #cbd5e1", borderRadius: 6, padding: 14, fontSize: 13, color: "#0f172a", outline: "none", boxSizing: "border-box", resize: "vertical", marginTop: 16 }} />
                        <button style={{ background: "linear-gradient(135deg, #2563eb, #29ABE2)", border: "none", borderRadius: 6, padding: "8px 20px", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", marginTop: 14 }}>
                          Save Notes
                        </button>
                      </div>
                    )}

                    {detailsActiveTab === "Billing" && (
                      <div style={{ background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 24 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", borderBottom: "1px solid #f1f5f9", paddingBottom: 8, margin: "0 0 16px 0" }}>Billing Summary</h3>
                        
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24, marginTop: 16 }}>
                          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 16 }}>
                            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Total Budget</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>{details.budget}</div>
                          </div>
                          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 16 }}>
                            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Hourly Rate</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", marginTop: 4 }}>₹ 0 / hr</div>
                          </div>
                          <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: 16 }}>
                            <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Billed Amount</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: "#10b981", marginTop: 4 }}>₹ 0</div>
                          </div>
                        </div>

                        <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 16 }}>
                          <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>Invoices</div>
                          <div style={{ fontSize: 12, color: "#64748b", textAlign: "center", padding: 20 }}>No invoices generated for this project yet.</div>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })()}

              {/* Tab 7: Task Details View (Premium layout matching image exactly) */}
              {activeTab === "task_details" && selectedTask && (() => {
                const projectSlug = selectedTask.project_name ? selectedTask.project_name.substring(0, 3).toUpperCase() : "TASK";
                const taskCode = selectedTask.code || `#${projectSlug}-${selectedTask.id}`;
                
                const checklistItems = selectedTask.checklist || [];
                const completedCount = checklistItems.filter(item => item.checked).length;
                const totalCount = checklistItems.length;

                const priorityBgColors = {
                  Low: "#ecfdf5",
                  Medium: "#fef9c3",
                  High: "#ffedd5",
                  Critical: "#fee2e2"
                };
                const priorityTextColors = {
                  Low: "#047857",
                  Medium: "#a16207",
                  High: "#c2410c",
                  Critical: "#b91c1c"
                };

                const priorityColor = selectedTask.priority || "Low";

                return (
                  <div style={{ background: "#f8fafc", color: "#1e293b", minHeight: "100vh" }}>
                    
                    {/* Header bar */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <button onClick={() => { setActiveTab("tasks"); setSelectedTask(null); }} 
                          style={{ border: "none", background: "none", cursor: "pointer", fontSize: 20, color: "#0f172a", padding: "0 4px" }}
                          title="Back">
                          ←
                        </button>
                        <div>
                          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#0f172a", margin: 0 }}>Task Details</h2>
                          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4, fontWeight: 600 }}>
                            Dashboard &nbsp;&gt;&nbsp; Tasks &nbsp;&gt;&nbsp; <span style={{ color: "#64748b" }}>{taskCode}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div style={{ display: "flex", gap: 12 }}>
                        <button onClick={() => {
                          setTaskName(selectedTask.name);
                          setTaskProjectId(String(selectedTask.project));
                          setTaskMilestone(selectedTask.milestone || "Select Milestone (Optional)");
                          setTaskDescription(selectedTask.description || "");
                          setTaskChecklist(selectedTask.checklist || []);
                          setTaskAssignedTo(selectedTask.assigned_to || "");
                          setTaskAssignBy(selectedTask.assigned_by || "Admin");
                          setTaskPriority(selectedTask.priority || "Low");
                          setTaskDueDate(selectedTask.due_date || "");
                          setTaskEstHours(String(selectedTask.estimated_hours || ""));
                          setTaskStatus(selectedTask.status || "To Do");
                          setTaskTags(selectedTask.tags || []);
                          
                          setTaskEditingId(selectedTask.id);
                          setActiveTab("add_task");
                        }}
                          style={{ background: "#fff", border: "1px solid #cbd5e1", borderRadius: 6, padding: "8px 16px", color: "#475569", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                          Edit Task
                        </button>
                        <button onClick={() => handleUpdateTaskStatus(selectedTask.id, selectedTask.status === "Completed" ? "In Progress" : "Completed")}
                          style={{ background: selectedTask.status === "Completed" ? "#64748b" : "#10b981", border: "none", borderRadius: 6, padding: "8px 16px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                          ✓ {selectedTask.status === "Completed" ? "Mark In Progress" : "Mark Complete"}
                        </button>
                      </div>
                    </div>

                    {/* Main Layout Grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "1.8fr 1.2fr 1fr", gap: 24, marginBottom: 24 }}>
                      
                      {/* Left Column: Task Main info */}
                      <div style={{ background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                            <h1 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", margin: 0 }}>{selectedTask.name}</h1>
                            <span style={{ fontSize: 16, cursor: "pointer", color: "#eab308" }}>⭐</span>
                            <span style={{ background: selectedTask.status === "Completed" ? "#f0fdf4" : "#eff6ff", color: selectedTask.status === "Completed" ? "#166534" : "#1e40af", padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                              {selectedTask.status}
                            </span>
                          </div>

                          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, color: "#64748b", fontWeight: 600 }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              📁 {selectedTask.project_name || "Unknown Project"}
                            </span>
                            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              🚩 Milestone: {selectedTask.milestone || "General"}
                            </span>
                            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              🏷️ {taskCode}
                            </span>
                          </div>
                        </div>

                        <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 16 }}>
                          <h3 style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", margin: "0 0 8px 0" }}>Description</h3>
                          <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, margin: 0, whiteSpace: "pre-line" }}>
                            {selectedTask.description || "No description provided."}
                          </p>
                        </div>

                        {/* Checklist */}
                        <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 16 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                            <h3 style={{ fontSize: 13, fontWeight: 800, color: "#0f172a", margin: 0 }}>Checklist</h3>
                            <span style={{ fontSize: 12, color: "#10b981", fontWeight: 700 }}>{completedCount}/{totalCount}</span>
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {checklistItems.map((item, idx) => (
                              <label key={idx} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: item.checked ? "#94a3b8" : "#334155", textDecoration: item.checked ? "line-through" : "none", cursor: "pointer" }}>
                                <input type="checkbox" checked={item.checked || false} onChange={() => handleToggleChecklistDetails(idx)}
                                  style={{ width: 15, height: 15, cursor: "pointer" }} />
                                {item.text}
                              </label>
                            ))}
                            
                            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                              <input type="text" placeholder="Add checklist item" value={taskDetailsChecklistInput} onChange={e => setTaskDetailsChecklistInput(e.target.value)}
                                style={{ flex: 1, height: 32, border: "1px solid #cbd5e1", borderRadius: 6, padding: "0 10px", fontSize: 12 }} />
                              <button onClick={handleAddChecklistDetailsItem}
                                style={{ background: "none", border: "none", color: "#2563eb", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                                + Add item
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Middle Column: Task Info Sidebar */}
                      <div style={{ background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", borderBottom: "1px solid #f1f5f9", paddingBottom: 8, margin: 0 }}>Task Information</h3>
                        
                        <div style={{ display: "flex", flexDirection: "column", gap: 14, fontSize: 12 }}>
                          
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ color: "#64748b", fontWeight: 600 }}>Assigned To</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <UserAvatar name={selectedTask.assigned_to} size={22} />
                              <span style={{ color: "#0f172a", fontWeight: 700 }}>{selectedTask.assigned_to || "Unassigned"}</span>
                            </div>
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ color: "#64748b", fontWeight: 600 }}>Assigned By</span>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <UserAvatar name={selectedTask.assigned_by} size={22} />
                              <span style={{ color: "#0f172a", fontWeight: 700 }}>{selectedTask.assigned_by || "Admin"}</span>
                            </div>
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ color: "#64748b", fontWeight: 600 }}>Priority</span>
                            <span style={{ background: priorityBgColors[priorityColor], color: priorityTextColors[priorityColor], padding: "2px 8px", borderRadius: 12, fontSize: 10, fontWeight: 700 }}>
                              {selectedTask.priority || "Low"}
                            </span>
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ color: "#64748b", fontWeight: 600 }}>Due Date</span>
                            <span style={{ color: "#0f172a", fontWeight: 700 }}>{formatDateStr(selectedTask.due_date)}</span>
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ color: "#64748b", fontWeight: 600 }}>Estimated Hours</span>
                            <span style={{ color: "#0f172a", fontWeight: 700 }}>{selectedTask.estimated_hours} hrs</span>
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ color: "#64748b", fontWeight: 600 }}>Actual Hours</span>
                            <span style={{ color: "#2563eb", fontWeight: 700 }}>{selectedTask.actual_hours} hrs</span>
                          </div>

                          {/* Hours logging utility */}
                          <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 10, marginTop: 4 }}>
                            <label style={{ fontSize: 10, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Log Time Worked</label>
                            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                              <input type="number" placeholder="Hours" value={loggedActualHours} onChange={e => setLoggedActualHours(e.target.value)}
                                style={{ width: 80, height: 28, border: "1px solid #cbd5e1", borderRadius: 6, padding: "0 8px", fontSize: 11 }} />
                              <button onClick={handleLogHours}
                                style={{ background: "#2563eb", border: "none", borderRadius: 6, color: "#fff", padding: "0 12px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                                Log
                              </button>
                            </div>
                          </div>

                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #f1f5f9", paddingTop: 10 }}>
                            <span style={{ color: "#64748b", fontWeight: 600 }}>Created On</span>
                            <span style={{ color: "#64748b" }}>{formatDateStr(selectedTask.created_at)}</span>
                          </div>

                        </div>
                      </div>

                      {/* Right Column: Activity Log */}
                      <div style={{ background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 24, display: "flex", flexDirection: "column" }}>
                        <h3 style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", borderBottom: "1px solid #f1f5f9", paddingBottom: 8, margin: "0 0 16px 0" }}>Activity Log</h3>
                        
                        <div style={{ display: "flex", flexDirection: "column", gap: 16, overflowY: "auto", maxHeight: 300 }}>
                          {(selectedTask.activity_log && selectedTask.activity_log.length > 0) ? (
                            selectedTask.activity_log.map((log, idx) => (
                              <div key={idx} style={{ display: "flex", gap: 10, fontSize: 11, position: "relative" }}>
                                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6", marginTop: 4 }} />
                                  {idx < selectedTask.activity_log.length - 1 && (
                                    <span style={{ flex: 1, width: 1.5, background: "#cbd5e1", margin: "4px 0" }} />
                                  )}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 700, color: "#0f172a" }}>{log.action}</div>
                                  <div style={{ color: "#64748b", fontSize: 9, marginTop: 2 }}>
                                    {new Date(log.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })} by {log.by}
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div style={{ display: "flex", gap: 10, fontSize: 11 }}>
                              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6", marginTop: 4 }} />
                              <div>
                                <div style={{ fontWeight: 700, color: "#0f172a" }}>Task created</div>
                                <div style={{ color: "#64748b", fontSize: 9, marginTop: 2 }}>{formatDateStr(selectedTask.created_at)} by {selectedTask.assigned_by}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                    </div>

                    {/* Bottom: Attachments and Comments section */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                      
                      {/* Attachments Card */}
                      <div style={{ background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 24 }}>
                        <h3 style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", borderBottom: "1px solid #f1f5f9", paddingBottom: 8, margin: "0 0 16px 0" }}>Attachments ({(selectedTask.attachments || []).length})</h3>
                        
                        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                          {(selectedTask.attachments || []).map((file, idx) => (
                            <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <span style={{ fontSize: 18 }}>📄</span>
                                <div>
                                  <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>{file.filename}</div>
                                  <div style={{ fontSize: 9, color: "#94a3b8" }}>{(file.sizeBytes / 1024 / 1024).toFixed(1)} MB • {formatDateStr(file.uploadedAt)}</div>
                                </div>
                              </div>
                              <span style={{ color: "#2563eb", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>Download</span>
                            </div>
                          ))}

                          {/* File input drag & drop upload box */}
                          <div style={{ border: "2px dashed #cbd5e1", borderRadius: 8, padding: 16, textAlign: "center", cursor: "pointer", background: "#f8fafc", position: "relative" }}>
                            <input type="file" onChange={handleUploadTaskAttachment} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }} />
                            <div style={{ fontSize: 20, color: "#94a3b8" }}>☁️</div>
                            <div style={{ fontSize: 11, color: "#475569", fontWeight: 700, marginTop: 6 }}>Drag & drop files or <span style={{ color: "#2563eb" }}>click to upload</span></div>
                          </div>
                        </div>
                      </div>

                      {/* Comments Card */}
                      <div style={{ background: "#ffffff", borderRadius: 12, border: "1px solid #e2e8f0", padding: 24, display: "flex", flexDirection: "column" }}>
                        <h3 style={{ fontSize: 14, fontWeight: 800, color: "#0f172a", borderBottom: "1px solid #f1f5f9", paddingBottom: 8, margin: "0 0 16px 0" }}>Comments ({(selectedTask.comments || []).length})</h3>
                        
                        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 12, flex: 1, maxHeight: 200, overflowY: "auto", marginBottom: 16 }}>
                          {(selectedTask.comments || []).length > 0 ? (
                            selectedTask.comments.map((comm, idx) => (
                              <div key={idx} style={{ display: "flex", gap: 10, fontSize: 12 }}>
                                <UserAvatar name={comm.author} size={28} />
                                <div>
                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <strong style={{ color: "#0f172a" }}>{comm.author}</strong>
                                    <span style={{ fontSize: 9, color: "#94a3b8" }}>{new Date(comm.timestamp).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                  <p style={{ color: "#475569", margin: "4px 0 0 0", lineHeight: 1.4 }}>{comm.content}</p>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", padding: 20 }}>No comments posted yet.</div>
                          )}
                        </div>

                        {/* Comment typing area */}
                        <div style={{ display: "flex", gap: 10 }}>
                          <textarea placeholder="Write a comment..." value={taskDetailsCommentInput} onChange={e => setTaskDetailsCommentInput(e.target.value)}
                            style={{ flex: 1, minHeight: 48, maxHeight: 80, border: "1px solid #cbd5e1", borderRadius: 6, padding: "8px 12px", fontSize: 12, color: "#0f172a", resize: "none", outline: "none" }} />
                          <button onClick={handlePostTaskComment}
                            style={{ background: "#2563eb", border: "none", borderRadius: 6, color: "#fff", width: 44, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, cursor: "pointer" }}>
                            ➤
                          </button>
                        </div>
                      </div>

                    </div>

                  </div>
                );
              })()}

            </main>
          </div>

        </div>
      )}

      {/* ── View C: ADMIN LOGIN MODAL OVERLAY ─────────────────────────────── */}
      {showLoginModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          backgroundColor: "rgba(11, 18, 36, 0.75)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div style={{
            background: "#fff", borderRadius: 12, width: "100%", maxWidth: 400,
            padding: 32, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
            border: "1px solid #e2e8f0"
          }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ display: "inline-flex", padding: "8px 16px", background: "#0b1224", borderRadius: 8, marginBottom: 12 }}>
                <span style={{ color: "#fff", fontSize: 18, fontWeight: 300 }}>tres</span>
                <span style={{ color: "#29ABE2", fontSize: 18, fontWeight: 700 }}>v</span>
                <span style={{ color: "#fff", fontSize: 18, fontWeight: 300 }}>ance</span>
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0f172a", margin: "0 0 6px 0" }}>Admin Authentication</h3>
              <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>Enter login details to access PM Dashboard</p>
            </div>

            {loginError && (
              <div style={{
                background: "#fef2f2", border: "1px solid #fee2e2", color: "#b91c1c",
                borderRadius: 6, padding: "10px 12px", fontSize: 12, fontWeight: 600, marginBottom: 16
              }}>
                ⚠️ {loginError}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>Email</label>
                <input
                  type="email" required
                  value={username} onChange={e => setUsername(e.target.value)}
                  placeholder="e.g. admin@tresvance.com"
                  style={{
                    width: "100%", padding: "10px 14px", border: "1.5px solid #cbd5e1", borderRadius: 6,
                    fontSize: 13, outline: "none", boxSizing: "border-box"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#475569", marginBottom: 6 }}>Password</label>
                <input
                  type="password" required
                  value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: "100%", padding: "10px 14px", border: "1.5px solid #cbd5e1", borderRadius: 6,
                    fontSize: 13, outline: "none", boxSizing: "border-box"
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button type="button" onClick={() => setShowLoginModal(false)}
                  style={{
                    flex: 1, padding: "11px", borderRadius: 6, border: "1.5px solid #cbd5e1", background: "#fff",
                    color: "#475569", fontSize: 13, fontWeight: 700, cursor: "pointer"
                  }}>
                  Cancel
                </button>
                
                <button type="submit"
                  style={{
                    flex: 1, padding: "11px", borderRadius: 6, border: "none",
                    background: "linear-gradient(135deg, #2563eb, #29ABE2)",
                    color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer"
                  }}>
                  Login
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View D: ADD MEMBER TO PROJECT MODAL OVERLAY ───────────────────── */}
      {showAddMemberModal && (
        <div style={{
          position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
          backgroundColor: "rgba(11, 18, 36, 0.75)", backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000
        }}>
          <div style={{
            background: "#fff", borderRadius: 12, width: "100%", maxWidth: 400,
            padding: 32, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)",
            border: "1px solid #e2e8f0"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0f172a", margin: 0 }}>Add Project Member</h3>
              <button onClick={() => { setShowAddMemberModal(false); setNewMemberName(""); }} 
                style={{ background: "none", border: "none", color: "#94a3b8", cursor: "pointer", fontSize: 18, fontWeight: "bold" }}>
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={fieldGroupStyle}>
                <label style={fieldLabelStyle}>Select Team Member *</label>
                <select value={newMemberName} onChange={e => setNewMemberName(e.target.value)} style={lightSelectStyle}>
                  <option value="">Choose Member</option>
                  {teamMembers.map(m => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))}
                </select>
              </div>

              <div style={fieldGroupStyle}>
                <label style={fieldLabelStyle}>Role / Designation *</label>
                <select value={newMemberRole} onChange={e => setNewMemberRole(e.target.value)} style={lightSelectStyle}>
                  <option value="Project Manager">Project Manager</option>
                  <option value="UI/UX Designer">UI/UX Designer</option>
                  <option value="Frontend Developer">Frontend Developer</option>
                  <option value="Backend Developer">Backend Developer</option>
                  <option value="QA Engineer">QA Engineer</option>
                  <option value="DevOps Engineer">DevOps Engineer</option>
                </select>
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                <button onClick={() => { setShowAddMemberModal(false); setNewMemberName(""); }}
                  style={{
                    flex: 1, padding: "10px", borderRadius: 6, border: "1.5px solid #cbd5e1", background: "#fff",
                    color: "#475569", fontSize: 13, fontWeight: 700, cursor: "pointer"
                  }}>
                  Cancel
                </button>
                <button onClick={handleAddMemberToProjectSubmit}
                  style={{
                    flex: 1, padding: "10px", borderRadius: 6, border: "none",
                    background: "linear-gradient(135deg, #2563eb, #29ABE2)",
                    color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer"
                  }}>
                  Add Member
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// -- Styles variables --
const statsCard = {
  background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12,
  padding: 16, display: "flex", flexDirection: "column", justifyContent: "space-between",
  boxShadow: "0 4px 20px rgba(0,0,0,0.02)", minHeight: 110
};

const statsLbl = { fontSize: 11, textTransform: "uppercase", letterSpacing: 1, color: "#64748b", fontWeight: 700 };
const statsVal = { fontSize: 24, fontWeight: 800, color: "#0f172a", marginTop: 4 };
const statsIcon = { width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 };
const statsLink = { fontSize: 11, color: "#2563eb", fontWeight: 700, marginTop: "auto", cursor: "pointer", display: "inline-block" };

const cardWrap = { background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", boxShadow: "0 4px 20px rgba(0,0,0,0.02)" };
const cardHeader = { padding: "20px 20px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" };
const cardTitle = { fontSize: 14, fontWeight: 800, color: "#0f172a", margin: 0 };

const legendItem = { display: "flex", alignItems: "center", gap: 6, color: "#475569" };
const dot = { width: 8, height: 8, borderRadius: "50%", display: "inline-block" };

const moveBtn = { background: "#f1f5f9", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 10, padding: "2px 6px", color: "#64748b", transition: "background 0.2s" };

const bottomStat = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: 12, display: "flex", alignItems: "center", gap: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.02)" };
const bottomStatIcon = { fontSize: 18, background: "#f8fafc", width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" };
const bottomStatLabel = { fontSize: 9, textTransform: "uppercase", letterSpacing: 0.5, color: "#64748b", fontWeight: 700 };
const bottomStatValue = { fontSize: 14, fontWeight: 800, color: "#0f172a", marginTop: 1 };

const emptyBox = { background: "#fff", border: "1px solid #e2eaf0", borderRadius: 10, padding: 48, textAlign: "center", color: "#94a3b8", fontSize: 14 };

// -- New Light Theme Add Project CSS Styles --
const sectionTitleStyle = {
  fontSize: 15, fontWeight: 800, color: "#0f172a", borderBottom: "1.5px solid #f1f5f9",
  paddingBottom: 8, margin: "0 0 12px 0"
};

const fieldGroupStyle = {
  display: "flex", flexDirection: "column", gap: 6, width: "100%"
};

const fieldLabelStyle = {
  fontSize: 12, fontWeight: 700, color: "#334155"
};

const lightInputStyle = {
  width: "100%", padding: "10px 14px", border: "1px solid #cbd5e1",
  borderRadius: 6, fontSize: 13, color: "#0f172a", background: "#ffffff",
  outline: "none", boxSizing: "border-box", transition: "border 0.2s"
};

const lightSelectStyle = {
  width: "100%", padding: "10px 14px", border: "1px solid #cbd5e1",
  borderRadius: 6, fontSize: 13, color: "#0f172a", background: "#ffffff",
  outline: "none", boxSizing: "border-box"
};