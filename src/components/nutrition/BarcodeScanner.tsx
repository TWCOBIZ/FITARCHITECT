import React, { useState, useRef, useCallback } from 'react';
import { useNutrition } from '../../contexts/NutritionContext';
import { useProfile } from '../../contexts/ProfileContext';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, CircularProgress, Typography } from '@mui/material';
import Webcam from 'react-webcam';
import toast from 'react-hot-toast';

const BarcodeScanner = () => {
  const { scanBarcode, addFoodEntry, loading } = useNutrition();
  const { user, isPremium } = useProfile();
  const [scanning, setScanning] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [foodEntry, setFoodEntry] = useState(null);
  const [error, setError] = useState('');
  const webcamRef = useRef(null);

  // Simulate barcode scan (replace with real barcode scanner integration for production)
  const handleScan = async () => {
    setError('');
    if (!barcode) {
      setError('Please enter or scan a barcode.');
      return;
    }
    setScanning(true);
    try {
      const entry = await scanBarcode(barcode);
      if (entry) {
        setFoodEntry(entry);
      } else {
        setError('No product found.');
      }
    } catch (e) {
      setError('Failed to scan barcode.');
    } finally {
      setScanning(false);
    }
  };

  const handleAddToDiary = async () => {
    if (!foodEntry) return;
    await addFoodEntry(foodEntry);
    setFoodEntry(null);
    setBarcode('');
    toast.success('Added to diary!');
  };

  if (!isPremium) {
    return (
      <div style={{ textAlign: 'center', padding: 24 }}>
        <Typography variant="h6">Barcode Scanning is a Premium Feature</Typography>
        <Typography variant="body2">Upgrade to unlock food product scanning and instant nutrition info.</Typography>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 400, margin: '0 auto', padding: 16 }}>
      <Typography variant="h6">Scan Food Barcode</Typography>
      {/* Webcam or barcode input */}
      {/* For demo: manual input, replace with real scanner for production */}
      <input
        type="text"
        placeholder="Enter barcode manually or scan"
        value={barcode}
        onChange={e => setBarcode(e.target.value)}
        style={{ width: '100%', marginBottom: 8 }}
      />
      <Button variant="contained" color="primary" onClick={handleScan} disabled={scanning || loading} fullWidth>
        {scanning || loading ? <CircularProgress size={20} /> : 'Scan Barcode'}
      </Button>
      {error && <Typography color="error" style={{ marginTop: 8 }}>{error}</Typography>}
      {/* Modal for food entry result */}
      <Dialog open={!!foodEntry} onClose={() => setFoodEntry(null)}>
        <DialogTitle>Food Product Found</DialogTitle>
        <DialogContent>
          {foodEntry && (
            <div>
              <Typography variant="subtitle1">{foodEntry.name}</Typography>
              <Typography variant="body2">Calories: {foodEntry.calories}</Typography>
              <Typography variant="body2">Protein: {foodEntry.protein}g</Typography>
              <Typography variant="body2">Carbs: {foodEntry.carbs}g</Typography>
              <Typography variant="body2">Fat: {foodEntry.fat}g</Typography>
              <Typography variant="body2">Serving: {foodEntry.servingSize}</Typography>
              {foodEntry.imageUrl && <img src={foodEntry.imageUrl} alt="Product" style={{ width: 120, marginTop: 8 }} />}
            </div>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFoodEntry(null)}>Cancel</Button>
          <Button onClick={handleAddToDiary} variant="contained" color="primary">Add to Diary</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default BarcodeScanner; 