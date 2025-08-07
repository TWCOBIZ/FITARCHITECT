# Exercise GIFs Directory

This directory contains exercise demonstration GIFs for FitArchitect. The app is pre-configured to automatically detect and use these GIFs when available.

## Quick Setup (Recommended Sources)

### 1. Fitness Blender (Free, Open Source)
Download exercise GIFs from Fitness Blender's open collection:
- Website: https://www.fitnessblender.com
- License: Creative Commons (free for non-commercial use)
- Quality: High-quality, professional demonstrations

### 2. Darebee (Free)
Download from Darebee's exercise database:
- Website: https://darebee.com
- License: Free to use
- Quality: Clean, minimalist style

### 3. JEFIT (API Available)
Use JEFIT's exercise database:
- Website: https://www.jefit.com
- API: Available for developers
- Quality: Consistent, professional

## Required GIF Files

Place these GIF files in this directory for optimal coverage:

### Push Exercises
- `push-up.gif` - Standard push-up
- `incline-push-up.gif` - Incline push-up
- `decline-push-up.gif` - Decline push-up
- `diamond-push-up.gif` - Diamond push-up
- `bench-press.gif` - Barbell bench press
- `dumbbell-bench-press.gif` - Dumbbell bench press
- `overhead-press.gif` - Standing overhead press
- `shoulder-press.gif` - Seated dumbbell press
- `tricep-dips.gif` - Tricep dips

### Pull Exercises
- `pull-up.gif` - Standard pull-up
- `chin-up.gif` - Chin-up
- `lat-pulldown.gif` - Lat pulldown
- `bent-over-row.gif` - Bent-over barbell row
- `dumbbell-row.gif` - One-arm dumbbell row
- `bicep-curls.gif` - Standing bicep curls
- `hammer-curls.gif` - Hammer curls

### Leg Exercises
- `squat.gif` - Bodyweight squat
- `goblet-squat.gif` - Goblet squat
- `jump-squat.gif` - Jump squat
- `lunge.gif` - Forward lunge
- `reverse-lunge.gif` - Reverse lunge
- `walking-lunges.gif` - Walking lunges
- `deadlift.gif` - Conventional deadlift
- `romanian-deadlift.gif` - Romanian deadlift
- `calf-raises.gif` - Standing calf raises
- `leg-press.gif` - Leg press machine

### Core Exercises
- `plank.gif` - Standard plank
- `side-plank.gif` - Side plank
- `mountain-climbers.gif` - Mountain climbers
- `crunches.gif` - Basic crunches
- `bicycle-crunches.gif` - Bicycle crunches
- `russian-twists.gif` - Russian twists
- `leg-raises.gif` - Leg raises
- `dead-bug.gif` - Dead bug

### Full Body/Cardio
- `burpee.gif` - Standard burpee
- `jumping-jacks.gif` - Jumping jacks
- `high-knees.gif` - High knees
- `butt-kickers.gif` - Butt kickers
- `squat-thrusts.gif` - Squat thrusts
- `bear-crawl.gif` - Bear crawl
- `inchworm.gif` - Inchworm

## File Naming Conventions

- Use lowercase letters
- Separate words with hyphens (-)
- Use .gif extension
- Keep names concise but descriptive
- Match the exercise names in the database

Examples:
- ✅ `push-up.gif`
- ✅ `dumbbell-bench-press.gif`
- ❌ `Push_Up.GIF`
- ❌ `dumbbellBenchPress.gif`

## Technical Specifications

- **Format**: GIF (animated)
- **Recommended Size**: 400x400px to 600x600px
- **File Size**: Under 2MB per GIF for fast loading
- **Duration**: 2-4 seconds per loop
- **Frame Rate**: 10-15 FPS for smooth animation
- **Compression**: Optimize for web (use tools like GIMP, Photoshop, or online compressors)

## Integration

The app automatically:
1. Checks for WGER API images first
2. Falls back to Fitness Blender GIFs if available
3. Uses gradient backgrounds with icons as final fallback

No code changes needed - just add the GIF files to this directory!

## Testing

To test your GIFs:
1. Add GIF files to this directory
2. Restart the development server
3. Generate a workout plan
4. Check that exercises show GIFs instead of gradient backgrounds
5. Verify GIFs auto-play and loop correctly

## Performance Tips

- Optimize GIF file sizes for mobile users
- Consider using WebP format for better compression (future enhancement)
- GIFs are cached by the browser for faster subsequent loads
- The app lazy-loads GIFs to improve initial page load times

## License Note

Ensure any GIFs you use comply with their respective licenses. The sources mentioned above are free for non-commercial or educational use, but verify current terms before deploying to production.