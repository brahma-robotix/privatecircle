/**
 * Distance & Geo-Relation Calculation Service
 * Mathematical Haversine computation, flight estimates, and dual-timezone helpers
 */

import { Coordinates } from '../types';

export interface DistanceResult {
  kilometers: number;
  miles: number;
  formattedKm: string;
  formattedMiles: string;
  approxFlightHours: number;
}

export const DistanceService = {
  /**
   * Calculates great-circle distance between two points using the Haversine formula
   */
  calculateDistance: (coord1: Coordinates, coord2: Coordinates): DistanceResult => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = ((coord2.latitude - coord1.latitude) * Math.PI) / 180;
    const dLon = ((coord2.longitude - coord1.longitude) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((coord1.latitude * Math.PI) / 180) *
        Math.cos((coord2.latitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const kilometers = Math.round(R * c);
    const miles = Math.round(kilometers * 0.621371);

    // Approximate commercial jet flight speed ~800 km/h + 45 min takeoff/landing
    const approxFlightHours = Math.round((kilometers / 750 + 0.75) * 10) / 10;

    return {
      kilometers,
      miles,
      formattedKm: kilometers.toLocaleString(),
      formattedMiles: miles.toLocaleString(),
      approxFlightHours,
    };
  },

  /**
   * Calculates days, hours, and minutes together from a starting date
   */
  calculateDaysTogether: (startDateString: string): { days: number; hours: number; totalFormatted: string } => {
    try {
      const start = new Date(startDateString).getTime();
      const now = new Date().getTime();
      const diffMs = Math.max(0, now - start);

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

      return {
        days,
        hours,
        totalFormatted: `${days} Days & ${hours} Hours`,
      };
    } catch {
      return { days: 0, hours: 0, totalFormatted: '0 Days' };
    }
  },

  /**
   * Formats local time for key couple cities
   */
  getCityTime: (cityName: string): { time: string; period: string; isDaytime: boolean } => {
    const now = new Date();
    let timeZone = 'UTC';

    if (cityName.toLowerCase().includes('new york')) {
      timeZone = 'America/New_York';
    } else if (cityName.toLowerCase().includes('paris')) {
      timeZone = 'Europe/Paris';
    } else if (cityName.toLowerCase().includes('tokyo')) {
      timeZone = 'Asia/Tokyo';
    } else if (cityName.toLowerCase().includes('san francisco')) {
      timeZone = 'America/Los_Angeles';
    }

    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });

      const formatted = formatter.format(now);
      const [time, period] = formatted.split(' ');

      // Extract 24-hr hour to check daytime
      const hourFormatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: 'numeric',
        hourCycle: 'h23',
      });
      const hour24 = parseInt(hourFormatter.format(now), 10);
      const isDaytime = hour24 >= 6 && hour24 < 20;

      return {
        time,
        period: period || '',
        isDaytime,
      };
    } catch {
      return { time: '12:00', period: 'PM', isDaytime: true };
    }
  },
};
