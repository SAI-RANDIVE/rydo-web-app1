/**
 * Shuttle Routes Data for Major Indian Metropolitan Cities
 * Contains route information, pricing, and schedules
 */

const shuttleRoutes = [
  {
    id: 1,
    name: 'Delhi-NCR Express',
    description: 'Connect across Delhi-NCR region with stops at major landmarks',
    start_point: 'Connaught Place, New Delhi',
    end_point: 'Cyber City, Gurugram',
    stops: [
      { name: 'Connaught Place', location: { lat: 28.6289, lng: 77.2091 }, city: 'New Delhi' },
      { name: 'Karol Bagh', location: { lat: 28.6449, lng: 77.1906 }, city: 'New Delhi' },
      { name: 'Dhaula Kuan', location: { lat: 28.5921, lng: 77.1564 }, city: 'New Delhi' },
      { name: 'Delhi Airport T3', location: { lat: 28.5561, lng: 77.1000 }, city: 'New Delhi' },
      { name: 'Cyber Hub', location: { lat: 28.4949, lng: 77.0880 }, city: 'Gurugram' },
      { name: 'Cyber City', location: { lat: 28.4959, lng: 77.0910 }, city: 'Gurugram' }
    ],
    distance: 32.5,
    estimated_duration: '60-75 min',
    base_fare: 250,
    per_km_rate: 12,
    passenger_capacity: 20,
    schedule_frequency: 30, // minutes
    operating_hours: { start: '06:00', end: '22:00' },
    peak_hours: [
      { start: '08:00', end: '10:30', surge_factor: 1.25 },
      { start: '17:30', end: '20:00', surge_factor: 1.25 }
    ]
  },
  {
    id: 2,
    name: 'Mumbai Coastal Connect',
    description: 'Travel along Mumbai\'s western coastline with sea-view routes',
    start_point: 'Churchgate, Mumbai',
    end_point: 'Borivali, Mumbai',
    stops: [
      { name: 'Churchgate', location: { lat: 18.9322, lng: 72.8264 }, city: 'Mumbai' },
      { name: 'Marine Drive', location: { lat: 18.9442, lng: 72.8237 }, city: 'Mumbai' },
      { name: 'Worli Sea Face', location: { lat: 19.0096, lng: 72.8150 }, city: 'Mumbai' },
      { name: 'Bandra Bandstand', location: { lat: 19.0509, lng: 72.8206 }, city: 'Mumbai' },
      { name: 'Juhu Beach', location: { lat: 19.0883, lng: 72.8262 }, city: 'Mumbai' },
      { name: 'Borivali National Park', location: { lat: 19.2147, lng: 72.8694 }, city: 'Mumbai' }
    ],
    distance: 40.2,
    estimated_duration: '80-100 min',
    base_fare: 300,
    per_km_rate: 15,
    passenger_capacity: 20,
    schedule_frequency: 30, // minutes
    operating_hours: { start: '06:00', end: '23:00' },
    peak_hours: [
      { start: '08:30', end: '11:00', surge_factor: 1.3 },
      { start: '18:00', end: '21:00', surge_factor: 1.3 }
    ]
  },
  {
    id: 3,
    name: 'Bangalore Tech Corridor',
    description: 'Connect major tech parks and business districts across Bangalore',
    start_point: 'MG Road, Bangalore',
    end_point: 'Electronic City, Bangalore',
    stops: [
      { name: 'MG Road', location: { lat: 12.9716, lng: 77.6099 }, city: 'Bangalore' },
      { name: 'Koramangala', location: { lat: 12.9352, lng: 77.6245 }, city: 'Bangalore' },
      { name: 'HSR Layout', location: { lat: 12.9116, lng: 77.6741 }, city: 'Bangalore' },
      { name: 'Silk Board', location: { lat: 12.9170, lng: 77.6226 }, city: 'Bangalore' },
      { name: 'Electronic City Phase 1', location: { lat: 12.8399, lng: 77.6770 }, city: 'Bangalore' },
      { name: 'Electronic City Phase 2', location: { lat: 12.8430, lng: 77.6722 }, city: 'Bangalore' }
    ],
    distance: 22.5,
    estimated_duration: '60-90 min',
    base_fare: 200,
    per_km_rate: 14,
    passenger_capacity: 20,
    schedule_frequency: 30, // minutes
    operating_hours: { start: '05:30', end: '23:30' },
    peak_hours: [
      { start: '08:00', end: '11:00', surge_factor: 1.4 },
      { start: '17:00', end: '20:30', surge_factor: 1.4 }
    ]
  },
  {
    id: 4,
    name: 'Chennai Coastal Route',
    description: 'Travel along Chennai\'s scenic East Coast Road',
    start_point: 'Chennai Central, Chennai',
    end_point: 'Mahabalipuram, Chennai',
    stops: [
      { name: 'Chennai Central', location: { lat: 13.0827, lng: 80.2707 }, city: 'Chennai' },
      { name: 'Marina Beach', location: { lat: 13.0500, lng: 80.2824 }, city: 'Chennai' },
      { name: 'Adyar', location: { lat: 13.0012, lng: 80.2565 }, city: 'Chennai' },
      { name: 'Thiruvanmiyur', location: { lat: 12.9830, lng: 80.2594 }, city: 'Chennai' },
      { name: 'ECR Toll', location: { lat: 12.8608, lng: 80.2349 }, city: 'Chennai' },
      { name: 'Mahabalipuram', location: { lat: 12.6269, lng: 80.1928 }, city: 'Chennai' }
    ],
    distance: 57.8,
    estimated_duration: '90-120 min',
    base_fare: 350,
    per_km_rate: 12,
    passenger_capacity: 20,
    schedule_frequency: 30, // minutes
    operating_hours: { start: '06:00', end: '22:00' },
    peak_hours: [
      { start: '08:30', end: '10:30', surge_factor: 1.2 },
      { start: '17:00', end: '19:30', surge_factor: 1.2 }
    ]
  },
  {
    id: 5,
    name: 'Hyderabad Heritage Tour',
    description: 'Connect historic and modern landmarks across Hyderabad',
    start_point: 'Charminar, Hyderabad',
    end_point: 'HITEC City, Hyderabad',
    stops: [
      { name: 'Charminar', location: { lat: 17.3616, lng: 78.4747 }, city: 'Hyderabad' },
      { name: 'Hussain Sagar', location: { lat: 17.4239, lng: 78.4738 }, city: 'Hyderabad' },
      { name: 'Banjara Hills', location: { lat: 17.4156, lng: 78.4347 }, city: 'Hyderabad' },
      { name: 'Jubilee Hills', location: { lat: 17.4321, lng: 78.4075 }, city: 'Hyderabad' },
      { name: 'Gachibowli', location: { lat: 17.4401, lng: 78.3489 }, city: 'Hyderabad' },
      { name: 'HITEC City', location: { lat: 17.4435, lng: 78.3772 }, city: 'Hyderabad' }
    ],
    distance: 26.3,
    estimated_duration: '60-80 min',
    base_fare: 220,
    per_km_rate: 13,
    passenger_capacity: 20,
    schedule_frequency: 30, // minutes
    operating_hours: { start: '06:30', end: '22:30' },
    peak_hours: [
      { start: '08:30', end: '11:00', surge_factor: 1.25 },
      { start: '17:30', end: '20:00', surge_factor: 1.25 }
    ]
  }
];

// Generate schedules for each route based on operating hours and frequency
const generateSchedules = () => {
  const schedules = [];
  let scheduleId = 1;
  
  // Get current date
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Generate schedules for today and tomorrow
  [today, tomorrow].forEach(date => {
    shuttleRoutes.forEach(route => {
      const { id: routeId, operating_hours, schedule_frequency, peak_hours } = route;
      
      // Parse operating hours
      const startTime = new Date(date);
      const [startHour, startMinute] = operating_hours.start.split(':').map(Number);
      startTime.setHours(startHour, startMinute, 0, 0);
      
      const endTime = new Date(date);
      const [endHour, endMinute] = operating_hours.end.split(':').map(Number);
      endTime.setHours(endHour, endMinute, 0, 0);
      
      // Generate schedules at regular intervals
      let currentTime = new Date(startTime);
      
      while (currentTime <= endTime) {
        // Calculate if this time is during peak hours
        let isPeakHour = false;
        let surgeFactor = 1;
        
        peak_hours.forEach(peak => {
          const peakStart = new Date(date);
          const [peakStartHour, peakStartMinute] = peak.start.split(':').map(Number);
          peakStart.setHours(peakStartHour, peakStartMinute, 0, 0);
          
          const peakEnd = new Date(date);
          const [peakEndHour, peakEndMinute] = peak.end.split(':').map(Number);
          peakEnd.setHours(peakEndHour, peakEndMinute, 0, 0);
          
          if (currentTime >= peakStart && currentTime <= peakEnd) {
            isPeakHour = true;
            surgeFactor = peak.surge_factor;
          }
        });
        
        // Calculate arrival time (departure time + estimated duration)
        const arrivalTime = new Date(currentTime);
        const [minDuration, maxDuration] = route.estimated_duration.split('-').map(t => parseInt(t.trim()));
        const averageDuration = (minDuration + maxDuration) / 2;
        arrivalTime.setMinutes(arrivalTime.getMinutes() + averageDuration);
        
        // Calculate fare with surge pricing if applicable
        const baseFare = route.base_fare;
        const distanceFare = route.distance * route.per_km_rate;
        const totalFare = Math.round((baseFare + distanceFare) * surgeFactor);
        
        schedules.push({
          id: scheduleId++,
          route_id: routeId,
          departure_time: new Date(currentTime),
          arrival_time: arrivalTime,
          current_passengers: Math.floor(Math.random() * 10), // Random initial passengers
          max_passengers: route.passenger_capacity,
          status: 'scheduled',
          is_peak_hour: isPeakHour,
          fare: totalFare
        });
        
        // Move to next schedule time
        currentTime.setMinutes(currentTime.getMinutes() + schedule_frequency);
      }
    });
  });
  
  return schedules;
};

// Export routes and schedules
module.exports = {
  routes: shuttleRoutes,
  schedules: generateSchedules
};
