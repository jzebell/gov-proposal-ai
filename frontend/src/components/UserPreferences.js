import React, { useState, useEffect } from 'react';

const UserPreferences = ({ theme, onThemeChange, onClose }) => {
  const [customTheme, setCustomTheme] = useState({
    background: theme?.background || '#ffffff',
    lowlight: theme?.textSecondary || '#6c757d',
    highlight: theme?.primary || '#007bff',
    selected: theme?.primary + 'dd' || '#007bffdd'
  });

  const [selectedPreset, setSelectedPreset] = useState('custom');
  const [previewTheme, setPreviewTheme] = useState(null);
  const [selectedBackgroundImage, setSelectedBackgroundImage] = useState('none');

  // 10 preset color palettes with the 4 main colors
  const presetThemes = {
    light: {
      name: 'Light',
      background: '#ffffff',
      lowlight: '#6c757d',
      highlight: '#007bff',
      selected: '#0056b3',
      surface: '#f8f9fa',
      text: '#212529',
      textSecondary: '#6c757d',
      border: '#dee2e6',
      sidebar: '#ffffff',
      sidebarText: '#495057'
    },
    dark: {
      name: 'Dark',
      background: '#1a202c',
      lowlight: '#718096',
      highlight: '#4299e1',
      selected: '#2b6cb0',
      surface: '#2d3748',
      text: '#e2e8f0',
      textSecondary: '#a0aec0',
      border: '#4a5568',
      sidebar: '#2d3748',
      sidebarText: '#e2e8f0'
    },
    oceanBlue: {
      name: 'Ocean Blue',
      background: '#f7fafc',
      lowlight: '#4a5568',
      highlight: '#3182ce',
      selected: '#2c5aa0',
      surface: '#edf2f7',
      text: '#2d3748',
      textSecondary: '#4a5568',
      border: '#cbd5e0',
      sidebar: '#ebf8ff',
      sidebarText: '#2b6cb0'
    },
    forestGreen: {
      name: 'Forest Green',
      background: '#f7fafc',
      lowlight: '#4a5568',
      highlight: '#38a169',
      selected: '#2f855a',
      surface: '#edf2f7',
      text: '#2d3748',
      textSecondary: '#4a5568',
      border: '#cbd5e0',
      sidebar: '#f0fff4',
      sidebarText: '#2f855a'
    },
    sunsetOrange: {
      name: 'Sunset Orange',
      background: '#fffaf0',
      lowlight: '#744210',
      highlight: '#dd6b20',
      selected: '#c05621',
      surface: '#fef5e7',
      text: '#2d3748',
      textSecondary: '#744210',
      border: '#e2e8f0',
      sidebar: '#fff7ed',
      sidebarText: '#9c4221'
    },
    royalPurple: {
      name: 'Royal Purple',
      background: '#faf5ff',
      lowlight: '#553c9a',
      highlight: '#805ad5',
      selected: '#6b46c1',
      surface: '#f3e8ff',
      text: '#2d3748',
      textSecondary: '#553c9a',
      border: '#e2e8f0',
      sidebar: '#f9f5ff',
      sidebarText: '#6b46c1'
    },
    crimsonRed: {
      name: 'Crimson Red',
      background: '#fffafa',
      lowlight: '#742a2a',
      highlight: '#e53e3e',
      selected: '#c53030',
      surface: '#fed7d7',
      text: '#2d3748',
      textSecondary: '#742a2a',
      border: '#feb2b2',
      sidebar: '#fff5f5',
      sidebarText: '#9b2c2c'
    },
    mintGreen: {
      name: 'Mint Green',
      background: '#f0fff4',
      lowlight: '#276749',
      highlight: '#48bb78',
      selected: '#38a169',
      surface: '#c6f6d5',
      text: '#2d3748',
      textSecondary: '#276749',
      border: '#9ae6b4',
      sidebar: '#f0fff4',
      sidebarText: '#2f855a'
    },
    goldenYellow: {
      name: 'Golden Yellow',
      background: '#fffff0',
      lowlight: '#975a16',
      highlight: '#ecc94b',
      selected: '#d69e2e',
      surface: '#fef5e7',
      text: '#2d3748',
      textSecondary: '#975a16',
      border: '#f6e05e',
      sidebar: '#fffff0',
      sidebarText: '#b7791f'
    },
    deepTeal: {
      name: 'Deep Teal',
      background: '#f0fdfa',
      lowlight: '#234e52',
      highlight: '#319795',
      selected: '#2c7a7b',
      surface: '#c6f7f5',
      text: '#2d3748',
      textSecondary: '#234e52',
      border: '#81e6d9',
      sidebar: '#e6fffa',
      sidebarText: '#2d5016'
    }
  };

  // Background image options
  const backgroundImages = [
    { id: 'none', name: 'None', url: null },
    { id: 'subtle-pattern', name: 'Subtle Pattern', url: 'data:image/svg+xml,%3Csvg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%23f8f9fa" fill-opacity="0.4"%3E%3Ccircle cx="3" cy="3" r="3"/%3E%3Ccircle cx="13" cy="13" r="3"/%3E%3C/g%3E%3C/svg%3E' },
    { id: 'geometric', name: 'Geometric', url: 'data:image/svg+xml,%3Csvg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%23f1f3f4" fill-opacity="0.3"%3E%3Cpath d="M20 20.5V18H0v-2h20v-2H0v-2h20v-2H0V8h20V6H0V4h20V2H0V0h22v20.5z"/%3E%3C/g%3E%3C/svg%3E' },
    { id: 'dots', name: 'Dots', url: 'data:image/svg+xml,%3Csvg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg"%3E%3Cdefs%3E%3Cpattern id="dots" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse"%3E%3Ccircle cx="15" cy="15" r="2" fill="%23e2e8f0"/%3E%3C/pattern%3E%3C/defs%3E%3Crect width="100%25" height="100%25" fill="url(%23dots)"/%3E%3C/svg%3E' },
    { id: 'waves', name: 'Waves', url: 'data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23e6fffa" fill-opacity="0.4"%3E%3Cpath d="M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E' },
    { id: 'hexagons', name: 'Hexagons', url: 'data:image/svg+xml,%3Csvg width="56" height="100" viewBox="0 0 56 100" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%23f7fafc" fill-opacity="0.5"%3E%3Cpath d="M28 66L0 50V16l28-16 28 16v34l-28 16z" fill-opacity="0.2"/%3E%3C/g%3E%3C/svg%3E' },
    { id: 'grid', name: 'Grid', url: 'data:image/svg+xml,%3Csvg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill-rule="evenodd"%3E%3Cg fill="%23e2e8f0" fill-opacity="0.3"%3E%3Cpath d="M96 95h4v1h-4v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4h-9v4h-1v-4H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15v-9H0v-1h15V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h9V0h1v15h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9h4v1h-4v9zm-1 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-10 0v-9h-9v9h9zm-9-10h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9zm10 0h9v-9h-9v9z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E' },
    { id: 'triangles', name: 'Triangles', url: 'data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23f1f3f4" fill-opacity="0.4"%3E%3Ctriangle fill-rule="nonzero"/%3E%3Cpath d="M30 15l15 25.98H15z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E' },
    { id: 'circuit', name: 'Circuit', url: 'data:image/svg+xml,%3Csvg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%23e6fffa" fill-opacity="0.3"%3E%3Cpath d="M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z"/%3E%3C/g%3E%3C/svg%3E' },
    { id: 'leaves', name: 'Leaves', url: 'data:image/svg+xml,%3Csvg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="%23f0fff4" fill-opacity="0.4"%3E%3Cpath d="M25 30c0-15 15-15 15 0s-15 15-15 0zm40 0c0-15 15-15 15 0s-15 15-15 0zM25 70c0-15 15-15 15 0s-15 15-15 0zm40 0c0-15 15-15 15 0s-15 15-15 0z"/%3E%3C/g%3E%3C/svg%3E' }
  ];

  // Generate full theme from 4 main colors
  const generateFullTheme = (colors, backgroundImageId = 'none') => {
    const isDark = isColorDark(colors.background);
    const backgroundImageData = backgroundImages.find(img => img.id === backgroundImageId);

    return {
      primary: colors.highlight,
      secondary: colors.lowlight,
      background: colors.background,
      backgroundImage: backgroundImageData?.url,
      surface: isDark ? lightenColor(colors.background, 10) : darkenColor(colors.background, 5),
      text: isDark ? '#e2e8f0' : '#212529',
      textSecondary: colors.lowlight,
      border: isDark ? lightenColor(colors.background, 20) : darkenColor(colors.background, 10),
      sidebar: isDark ? lightenColor(colors.background, 8) : colors.background,
      sidebarText: isDark ? '#e2e8f0' : '#495057'
    };
  };

  // Helper function to determine if a color is dark
  const isColorDark = (color) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return brightness < 128;
  };

  // Helper function to lighten a color
  const lightenColor = (color, percent) => {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  };

  // Helper function to darken a color
  const darkenColor = (color, percent) => {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return '#' + (0x1000000 + (R > 255 ? 255 : R < 0 ? 0 : R) * 0x10000 +
      (G > 255 ? 255 : G < 0 ? 0 : G) * 0x100 +
      (B > 255 ? 255 : B < 0 ? 0 : B)).toString(16).slice(1);
  };

  const handleColorChange = (colorType, value) => {
    const newTheme = { ...customTheme, [colorType]: value };
    setCustomTheme(newTheme);
    setSelectedPreset('custom');

    // Live preview
    const fullTheme = generateFullTheme(newTheme, selectedBackgroundImage);
    setPreviewTheme(fullTheme);
  };

  const handleBackgroundImageChange = (imageId) => {
    setSelectedBackgroundImage(imageId);

    // Live preview
    const themeColors = selectedPreset === 'custom' ? customTheme : {
      background: presetThemes[selectedPreset].background,
      lowlight: presetThemes[selectedPreset].lowlight,
      highlight: presetThemes[selectedPreset].highlight,
      selected: presetThemes[selectedPreset].selected
    };
    const fullTheme = generateFullTheme(themeColors, imageId);
    setPreviewTheme(fullTheme);
  };

  const handlePresetSelect = (presetKey) => {
    setSelectedPreset(presetKey);
    const preset = presetThemes[presetKey];
    const newCustomTheme = {
      background: preset.background,
      lowlight: preset.lowlight,
      highlight: preset.highlight,
      selected: preset.selected
    };
    setCustomTheme(newCustomTheme);
    const fullTheme = generateFullTheme(newCustomTheme, selectedBackgroundImage);
    setPreviewTheme(fullTheme);
  };

  const handleApply = () => {
    const themeColors = selectedPreset === 'custom' ? customTheme : {
      background: presetThemes[selectedPreset].background,
      lowlight: presetThemes[selectedPreset].lowlight,
      highlight: presetThemes[selectedPreset].highlight,
      selected: presetThemes[selectedPreset].selected
    };
    const fullTheme = generateFullTheme(themeColors, selectedBackgroundImage);

    onThemeChange(fullTheme);
    onClose();
  };

  const handleReset = () => {
    const defaultTheme = presetThemes.light;
    setCustomTheme({
      background: defaultTheme.background,
      lowlight: defaultTheme.lowlight,
      highlight: defaultTheme.highlight,
      selected: defaultTheme.selected
    });
    setSelectedPreset('light');
    setSelectedBackgroundImage('none');
    const fullTheme = generateFullTheme({
      background: defaultTheme.background,
      lowlight: defaultTheme.lowlight,
      highlight: defaultTheme.highlight,
      selected: defaultTheme.selected
    }, 'none');
    setPreviewTheme(fullTheme);
  };

  const currentTheme = previewTheme || theme;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: currentTheme.surface,
        borderRadius: '12px',
        padding: '0',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px',
          borderBottom: `1px solid ${currentTheme.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: '24px',
              color: currentTheme.text,
              fontWeight: '600'
            }}>
              🎨 Theme Preferences
            </h2>
            <p style={{
              margin: '4px 0 0 0',
              color: currentTheme.textSecondary,
              fontSize: '14px'
            }}>
              Customize your workspace colors and appearance
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              fontSize: '24px',
              color: currentTheme.textSecondary,
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = currentTheme.border}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '24px'
        }}>
          {/* Preset Themes */}
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '18px',
              color: currentTheme.text,
              fontWeight: '600'
            }}>
              Preset Themes
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '12px'
            }}>
              {Object.entries(presetThemes).map(([key, preset]) => (
                <button
                  key={key}
                  onClick={() => handlePresetSelect(key)}
                  style={{
                    padding: '16px 12px',
                    border: selectedPreset === key
                      ? `2px solid ${currentTheme.primary}`
                      : `1px solid ${currentTheme.border}`,
                    borderRadius: '8px',
                    backgroundColor: selectedPreset === key
                      ? currentTheme.primary + '10'
                      : currentTheme.background,
                    cursor: 'pointer',
                    textAlign: 'center',
                    position: 'relative'
                  }}
                >
                  {/* Theme Preview */}
                  <div style={{
                    width: '100%',
                    height: '60px',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    position: 'relative',
                    overflow: 'hidden',
                    border: `1px solid ${preset.border}`
                  }}>
                    {/* Background */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: preset.background
                    }} />

                    {/* Sidebar simulation */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '30%',
                      height: '100%',
                      backgroundColor: preset.sidebar,
                      borderRight: `1px solid ${preset.border}`
                    }} />

                    {/* Highlight elements */}
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      width: '20px',
                      height: '4px',
                      backgroundColor: preset.highlight,
                      borderRadius: '2px'
                    }} />

                    <div style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '8px',
                      width: '24px',
                      height: '4px',
                      backgroundColor: preset.selected,
                      borderRadius: '2px'
                    }} />

                    {/* Text simulation */}
                    <div style={{
                      position: 'absolute',
                      top: '20px',
                      right: '8px',
                      width: '16px',
                      height: '2px',
                      backgroundColor: preset.lowlight,
                      borderRadius: '1px'
                    }} />
                  </div>

                  <div style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    color: selectedPreset === key ? currentTheme.primary : currentTheme.text
                  }}>
                    {preset.name}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Colors */}
          <div>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '18px',
              color: currentTheme.text,
              fontWeight: '600'
            }}>
              Custom Colors
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px'
            }}>
              {[
                { key: 'background', label: 'Background', description: 'Main workspace background' },
                { key: 'lowlight', label: 'Secondary Text', description: 'Subtle text and labels' },
                { key: 'highlight', label: 'Primary Accent', description: 'Buttons and links' },
                { key: 'selected', label: 'Active State', description: 'Selected/pressed items' }
              ].map(({ key, label, description }) => (
                <div key={key} style={{
                  padding: '16px',
                  backgroundColor: currentTheme.background,
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: '8px'
                }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: currentTheme.text
                  }}>
                    {label}
                  </label>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '4px'
                  }}>
                    <input
                      type="color"
                      value={customTheme[key]}
                      onChange={(e) => handleColorChange(key, e.target.value)}
                      style={{
                        width: '40px',
                        height: '32px',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    />
                    <input
                      type="text"
                      value={customTheme[key]}
                      onChange={(e) => handleColorChange(key, e.target.value)}
                      style={{
                        flex: 1,
                        padding: '6px 8px',
                        fontSize: '12px',
                        border: `1px solid ${currentTheme.border}`,
                        borderRadius: '4px',
                        backgroundColor: currentTheme.surface,
                        color: currentTheme.text,
                        fontFamily: 'monospace'
                      }}
                    />
                  </div>

                  <div style={{
                    fontSize: '11px',
                    color: currentTheme.textSecondary,
                    lineHeight: '1.3'
                  }}>
                    {description}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Background Images */}
          <div style={{ marginTop: '32px' }}>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '18px',
              color: currentTheme.text,
              fontWeight: '600'
            }}>
              Background Patterns
            </h3>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
              gap: '12px'
            }}>
              {backgroundImages.map((bgImage) => (
                <button
                  key={bgImage.id}
                  onClick={() => handleBackgroundImageChange(bgImage.id)}
                  style={{
                    padding: '12px',
                    border: selectedBackgroundImage === bgImage.id
                      ? `2px solid ${currentTheme.primary}`
                      : `1px solid ${currentTheme.border}`,
                    borderRadius: '8px',
                    backgroundColor: selectedBackgroundImage === bgImage.id
                      ? currentTheme.primary + '10'
                      : currentTheme.background,
                    cursor: 'pointer',
                    textAlign: 'center',
                    position: 'relative',
                    height: '80px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {/* Background Preview */}
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '4px',
                    marginBottom: '8px',
                    border: `1px solid ${currentTheme.border}`,
                    backgroundColor: bgImage.id === 'none' ? currentTheme.surface : '#f8f9fa',
                    backgroundImage: bgImage.url ? `url("${bgImage.url}")` : 'none',
                    backgroundSize: 'cover',
                    backgroundRepeat: 'repeat',
                    position: 'relative'
                  }}>
                    {bgImage.id === 'none' && (
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        fontSize: '20px',
                        color: currentTheme.textSecondary
                      }}>
                        ∅
                      </div>
                    )}
                  </div>

                  <div style={{
                    fontSize: '11px',
                    fontWeight: '600',
                    color: selectedBackgroundImage === bgImage.id ? currentTheme.primary : currentTheme.text
                  }}>
                    {bgImage.name}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Live Preview */}
          <div style={{ marginTop: '32px' }}>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '18px',
              color: currentTheme.text,
              fontWeight: '600'
            }}>
              Live Preview
            </h3>

            <div style={{
              padding: '16px',
              backgroundColor: currentTheme.background,
              backgroundImage: currentTheme.backgroundImage ? `url("${currentTheme.backgroundImage}")` : 'none',
              backgroundSize: 'auto',
              backgroundRepeat: 'repeat',
              border: `2px solid ${currentTheme.border}`,
              borderRadius: '8px',
              position: 'relative'
            }}>
              {/* Mini sidebar */}
              <div style={{
                position: 'absolute',
                top: '16px',
                left: '16px',
                width: '60px',
                height: '120px',
                backgroundColor: currentTheme.sidebar,
                borderRadius: '4px',
                border: `1px solid ${currentTheme.border}`,
                padding: '8px'
              }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  backgroundColor: currentTheme.primary,
                  borderRadius: '2px',
                  marginBottom: '8px'
                }} />
                <div style={{
                  width: '80%',
                  height: '2px',
                  backgroundColor: currentTheme.textSecondary,
                  borderRadius: '1px',
                  marginBottom: '4px'
                }} />
                <div style={{
                  width: '60%',
                  height: '2px',
                  backgroundColor: currentTheme.textSecondary,
                  borderRadius: '1px',
                  marginBottom: '8px'
                }} />
                <div style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: customTheme.selected,
                  borderRadius: '2px'
                }} />
              </div>

              {/* Main content area */}
              <div style={{ marginLeft: '80px' }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: currentTheme.text,
                  marginBottom: '8px'
                }}>
                  Sample Interface
                </div>
                <div style={{
                  fontSize: '12px',
                  color: currentTheme.textSecondary,
                  marginBottom: '12px'
                }}>
                  This shows how your theme will look
                </div>
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  alignItems: 'center'
                }}>
                  <button style={{
                    padding: '6px 12px',
                    backgroundColor: customTheme.highlight,
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}>
                    Primary Button
                  </button>
                  <button style={{
                    padding: '6px 12px',
                    backgroundColor: customTheme.selected,
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer'
                  }}>
                    Selected State
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '20px 24px',
          borderTop: `1px solid ${currentTheme.border}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button
            onClick={handleReset}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              border: `1px solid ${currentTheme.border}`,
              borderRadius: '6px',
              color: currentTheme.textSecondary,
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Reset to Default
          </button>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                backgroundColor: 'transparent',
                border: `1px solid ${currentTheme.border}`,
                borderRadius: '6px',
                color: currentTheme.text,
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              style={{
                padding: '8px 16px',
                backgroundColor: currentTheme.primary,
                border: 'none',
                borderRadius: '6px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              Apply Theme
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserPreferences;