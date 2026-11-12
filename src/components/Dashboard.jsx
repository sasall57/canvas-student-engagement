import React, { useEffect, useState } from 'react';
import { loadAllData } from '../utils/csvUtils';
import ViewsByDayChart from '../charts/viewsByDayChart';
import WeeklyViewsChart from '../charts/weeklyViewsChart';
import NavPagesChart from '../charts/navPagesChart';
import TopResourcesChart from '../charts/topResourcesChart';
import './Dashboard.css';

function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAllData()
      .then(setData)
      .catch((err) => {
        console.error(err);
        setError(
          'Could not load the data files. Check that the CSVs are in public/data.',
        );
      });
  }, []);

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1 className="dashboard-title">Canvas Student Engagement</h1>
        <p className="dashboard-subtitle">Montclair Graduate Center</p>
      </header>

      {error && <p className="dashboard-message dashboard-error">{error}</p>}
      {!error && !data && <p className="dashboard-message">Loading data…</p>}

      {data && (
        <main className="dashboard-grid">
          <section className="dashboard-card dashboard-card-full">
            <ViewsByDayChart data={data.viewsByDay} />
          </section>

          <section className="dashboard-card dashboard-card-full">
            <WeeklyViewsChart data={data.weekly} />
          </section>

          <section className="dashboard-card dashboard-card-full">
            <NavPagesChart data={data.resources} />
          </section>

          <section className="dashboard-card dashboard-card-full">
            <TopResourcesChart data={data.resources} />
          </section>
        </main>
      )}
    </div>
  );
}

export default Dashboard;
