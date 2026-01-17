import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get("http://127.0.0.1:8000/api/home/")
      .then(res => {
        setProjects(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  return (
    <div className="container">
      <h1 className="title">Tresvance Projects</h1>
      
      {loading ? (
        <div className="loading">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="no-data">No projects found</div>
      ) : (
        <table className="project-table">
          <thead>
            <tr>
              <th>Project Name</th>
              <th>Mode</th>
              <th>URL</th>
              <th>Version</th>
              <th>Remarks</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project, index) => (
              <tr key={project.id || index}>
                <td>{project.name}</td>
                <td>{project.mode}</td>
                <td>
                  <a 
                    href={project.url} 
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {project.url}
                  </a>
                </td>
                <td>{project.version}</td>
                <td>{project.remarks}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default App;