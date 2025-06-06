// Implement charts, fetch analytics, responsive UI 
import React, { useEffect, useState } from 'react';
import { Typography, Tabs, Tab, Box, CircularProgress } from '@mui/material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

const DashboardAnalytics = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      try {
        const res = await fetch('/api/analytics');
        const data = await res.json();
        setAnalytics(data);
      } catch (e) {
        setAnalytics(null);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) return <Box textAlign="center" py={4}><CircularProgress /></Box>;
  if (!analytics) return <Typography color="error">Failed to load analytics.</Typography>;

  const chartData = analytics.dates.map((date, i) => ({
    date,
    calories: analytics.calories[i],
    protein: analytics.protein[i],
    carbs: analytics.carbs[i],
    fat: analytics.fat[i],
  }));

  return (
    <Box>
      <Typography variant="h5" gutterBottom>Analytics Dashboard</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)}>
        <Tab label="Calories" />
        <Tab label="Macros" />
        <Tab label="Streaks" />
      </Tabs>
      <Box mt={2}>
        {tab === 0 && (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="calories" stroke="#8884d8" name="Calories" />
            </LineChart>
          </ResponsiveContainer>
        )}
        {tab === 1 && (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 16, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="protein" fill="#82ca9d" name="Protein" />
              <Bar dataKey="carbs" fill="#8884d8" name="Carbs" />
              <Bar dataKey="fat" fill="#ffc658" name="Fat" />
            </BarChart>
          </ResponsiveContainer>
        )}
        {tab === 2 && (
          <Box>
            <Typography variant="h6">Current Streak: {analytics.streak} days</Typography>
            <Typography variant="h6">Best Streak: {analytics.bestStreak} days</Typography>
            <Typography variant="body1">Average Calories: {analytics.avgCalories}</Typography>
            <Typography variant="body1">Average Protein: {analytics.avgProtein}g</Typography>
            <Typography variant="body1">Average Carbs: {analytics.avgCarbs}g</Typography>
            <Typography variant="body1">Average Fat: {analytics.avgFat}g</Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default DashboardAnalytics; 