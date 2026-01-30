import L from 'leaflet';
import { TacticalUnit, UNIT_CONFIGS, AFFILIATION_COLORS, UnitAffiliation } from './types';

// Create NATO-style military symbol for units
export const createUnitIcon = (unit: TacticalUnit): L.DivIcon => {
  const config = UNIT_CONFIGS[unit.type];
  const affiliationColor = AFFILIATION_COLORS[unit.affiliation];
  
  // NATO symbol shape based on affiliation
  const getShape = (affiliation: UnitAffiliation) => {
    switch (affiliation) {
      case 'friendly':
        return `<rect x="2" y="6" width="20" height="12" rx="1" fill="${affiliationColor.fill}" stroke="${affiliationColor.stroke}" stroke-width="1.5"/>`;
      case 'hostile':
        return `<polygon points="12,2 22,12 12,22 2,12" fill="${affiliationColor.fill}" stroke="${affiliationColor.stroke}" stroke-width="1.5"/>`;
      case 'neutral':
        return `<rect x="2" y="2" width="20" height="20" fill="${affiliationColor.fill}" stroke="${affiliationColor.stroke}" stroke-width="1.5"/>`;
      case 'unknown':
        return `<path d="M12 2 L22 8 L22 16 L12 22 L2 16 L2 8 Z" fill="${affiliationColor.fill}" stroke="${affiliationColor.stroke}" stroke-width="1.5"/>`;
    }
  };

  // Status indicator
  const getStatusIndicator = () => {
    switch (unit.status) {
      case 'active':
        return '#22c55e';
      case 'engaging':
        return '#ef4444';
      case 'moving':
        return '#3b82f6';
      case 'standby':
        return '#f59e0b';
      case 'damaged':
        return '#f97316';
      case 'destroyed':
        return '#6b7280';
    }
  };

  const html = `
    <div class="tactical-unit-marker" style="transform: rotate(${unit.heading}deg);">
      <svg width="24" height="24" viewBox="0 0 24 24">
        ${getShape(unit.affiliation)}
        <text x="12" y="14" text-anchor="middle" font-size="8" fill="white">${config.icon}</text>
      </svg>
      <div class="unit-status-indicator" style="
        position: absolute;
        bottom: -4px;
        right: -4px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: ${getStatusIndicator()};
        border: 1px solid white;
        box-shadow: 0 0 4px ${getStatusIndicator()};
      "></div>
      ${unit.status === 'moving' ? `
        <div class="unit-heading-indicator" style="
          position: absolute;
          top: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          border-bottom: 6px solid ${affiliationColor.stroke};
        "></div>
      ` : ''}
    </div>
  `;

  return L.divIcon({
    className: 'tactical-unit-icon',
    html,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

// Create zone polygon style
export const getZoneStyle = (zoneType: string) => {
  switch (zoneType) {
    case 'control':
      return {
        color: '#3b82f6',
        weight: 2,
        opacity: 0.8,
        fillColor: '#3b82f6',
        fillOpacity: 0.15,
        dashArray: '5, 5',
      };
    case 'contested':
      return {
        color: '#f59e0b',
        weight: 2,
        opacity: 0.9,
        fillColor: '#f59e0b',
        fillOpacity: 0.2,
        dashArray: '10, 5',
      };
    case 'hostile':
      return {
        color: '#ef4444',
        weight: 2,
        opacity: 0.8,
        fillColor: '#ef4444',
        fillOpacity: 0.15,
        dashArray: '',
      };
    case 'objective':
      return {
        color: '#8b5cf6',
        weight: 3,
        opacity: 1,
        fillColor: '#8b5cf6',
        fillOpacity: 0.3,
        dashArray: '',
      };
    case 'restricted':
      return {
        color: '#6b7280',
        weight: 2,
        opacity: 0.6,
        fillColor: '#6b7280',
        fillOpacity: 0.1,
        dashArray: '2, 4',
      };
    default:
      return {
        color: '#22c55e',
        weight: 1,
        opacity: 0.5,
        fillColor: '#22c55e',
        fillOpacity: 0.1,
        dashArray: '',
      };
  }
};

// Create effective range circle style
export const getRangeCircleStyle = (unit: TacticalUnit) => {
  const affiliationColor = AFFILIATION_COLORS[unit.affiliation];
  return {
    color: affiliationColor.stroke,
    weight: 1,
    opacity: 0.4,
    fillColor: affiliationColor.fill,
    fillOpacity: 0.08,
    dashArray: '4, 4',
  };
};

// Format unit info for popup
export const formatUnitPopup = (unit: TacticalUnit): string => {
  const config = UNIT_CONFIGS[unit.type];
  const affiliationLabel = {
    friendly: '🔵 Friendly',
    hostile: '🔴 Hostile',
    neutral: '🟢 Neutral',
    unknown: '🟡 Unknown',
  }[unit.affiliation];

  return `
    <div class="tactical-popup" style="min-width: 200px; font-family: 'JetBrains Mono', monospace;">
      <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #333;">
        <span style="font-size: 20px;">${config.icon}</span>
        <div>
          <div style="font-weight: bold; font-size: 12px;">${unit.name}</div>
          <div style="font-size: 10px; color: #888;">${unit.callsign}</div>
        </div>
      </div>
      <div style="display: grid; gap: 4px; font-size: 10px;">
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #888;">Affiliation:</span>
          <span>${affiliationLabel}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #888;">Type:</span>
          <span>${config.category}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #888;">Status:</span>
          <span style="color: ${unit.status === 'active' ? '#22c55e' : unit.status === 'engaging' ? '#ef4444' : '#f59e0b'};">
            ${unit.status.toUpperCase()}
          </span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #888;">Strength:</span>
          <span style="color: ${unit.strength > 70 ? '#22c55e' : unit.strength > 40 ? '#f59e0b' : '#ef4444'};">
            ${Math.round(unit.strength)}%
          </span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="color: #888;">Heading:</span>
          <span>${unit.heading}°</span>
        </div>
        ${unit.speed > 0 ? `
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #888;">Speed:</span>
            <span>${unit.speed.toFixed(1)} km/h</span>
          </div>
        ` : ''}
        ${unit.effectiveRange ? `
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #888;">Range:</span>
            <span>${unit.effectiveRange} km</span>
          </div>
        ` : ''}
      </div>
    </div>
  `;
};
