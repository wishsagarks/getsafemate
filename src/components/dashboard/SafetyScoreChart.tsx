import React from 'react';
import { motion } from 'framer-motion';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';

interface SafetyEvent {
  id: string;
  event_type: string;
  severity: string;
  created_at: string;
  resolution_status?: string;
}

interface SafetyScoreChartProps {
  safetyData: SafetyEvent[];
}

export function SafetyScoreChart({ safetyData }: SafetyScoreChartProps) {
  // Group events by date
  const eventsByDate = safetyData.reduce((acc: Record<string, SafetyEvent[]>, event) => {
    const date = new Date(event.created_at).toLocaleDateString('en-US');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(event);
    return acc;
  }, {});

  // Calculate safety score for each date (10 - severity points)
  const safetyScores = Object.entries(eventsByDate).map(([date, events]) => {
    // Calculate severity points (critical: 3, high: 2, medium: 1, low: 0.5)
    const severityPoints = events.reduce((sum, event) => {
      switch (event.severity) {
        case 'critical': return sum + 3;
        case 'high': return sum + 2;
        case 'medium': return sum + 1;
        case 'low': return sum + 0.5;
        default: return sum;
      }
    }, 0);
    
    // Base score of 10, subtract severity points, minimum 1
    const score = Math.max(10 - severityPoints, 1);
    
    return {
      date,
      score,
      events: events.length
    };
  });

  // Sort by date
  const sortedScores = [...safetyScores].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Get last 14 entries or less
  const recentScores = sortedScores.slice(-14);

  // Calculate average safety score
  const avgScore = recentScores.length > 0
    ? recentScores.reduce((sum, day) => sum + day.score, 0) / recentScores.length
    : 10; // Default to 10 if no data

  // Calculate trend
  const getTrend = () => {
    if (recentScores.length < 4) return 'stable';
    
    const firstHalf = recentScores.slice(0, Math.floor(recentScores.length / 2));
    const secondHalf = recentScores.slice(Math.floor(recentScores.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, day) => sum + day.score, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, day) => sum + day.score, 0) / secondHalf.length;
    
    const diff = secondAvg - firstAvg;
    
    if (diff > 0.5) return 'improving';
    if (diff < -0.5) return 'declining';
    return 'stable';
  };

  const trend = getTrend();

  // If no safety data, show placeholder
  if (recentScores.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Shield className="h-12 w-12 text-green-500 mb-4" />
        <p className="text-white font-medium mb-2">Perfect Safety Record</p>
        <p className="text-neutral-400 text-center">No safety incidents recorded.<br />Keep up the great work!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Average Safety Score */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-sm text-neutral-400">Average Safety Score</span>
          <div className="text-2xl font-bold text-white">{avgScore.toFixed(1)}/10</div>
        </div>
        <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-black/30">
          {trend === 'improving' && <span className="text-green-400 text-sm">Improving ↑</span>}
          {trend === 'declining' && <span className="text-red-400 text-sm">Declining ↓</span>}
          {trend === 'stable' && <span className="text-yellow-400 text-sm">Stable →</span>}
        </div>
      </div>

      {/* Safety Score Chart */}
      <div className="relative h-64">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-neutral-500">
          <span>10</span>
          <span>8</span>
          <span>6</span>
          <span>4</span>
          <span>2</span>
          <span>0</span>
        </div>
        
        {/* Chart area */}
        <div className="ml-10 h-full flex items-end">
          <div className="w-full h-full flex items-end relative">
            {/* Horizontal grid lines */}
            {[0, 2, 4, 6, 8, 10].map((score) => (
              <div 
                key={score} 
                className="absolute w-full border-t border-white/10" 
                style={{ bottom: `${(score / 10) * 100}%` }}
              />
            ))}
            
            {/* Data points */}
            <div className="w-full h-full flex items-end">
              {recentScores.map((day, index) => {
                const heightPercentage = (day.score / 10) * 100;
                
                // Determine color based on score
                let barColor = 'bg-green-500';
                if (day.score < 4) barColor = 'bg-red-500';
                else if (day.score < 7) barColor = 'bg-yellow-500';
                
                return (
                  <div 
                    key={day.date} 
                    className="flex-1 flex flex-col items-center justify-end h-full"
                  >
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${heightPercentage}%` }}
                      transition={{ duration: 0.5, delay: index * 0.05 }}
                      className={`w-4 ${barColor} rounded-t-sm relative group`}
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-black/80 text-white text-xs rounded p-2 hidden group-hover:block whitespace-nowrap">
                        Score: {day.score.toFixed(1)}/10
                        <br />
                        Events: {day.events}
                      </div>
                      
                      {/* Event indicator */}
                      {day.events > 0 && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 flex items-center justify-center text-[10px] text-white">
                          {day.events}
                        </div>
                      )}
                    </motion.div>
                    <div className="mt-2 text-xs text-neutral-500 transform -rotate-45 origin-top-left">
                      {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Safety Score Legend */}
      <div className="flex justify-center space-x-4 pt-6">
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-xs text-neutral-400">Good (7-10)</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span className="text-xs text-neutral-400">Caution (4-6)</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-xs text-neutral-400">Risk (1-3)</span>
        </div>
      </div>
    </div>
  );
}