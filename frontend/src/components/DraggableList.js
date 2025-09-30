import React, { useState, useRef } from 'react';

/**
 * Reusable Draggable List Component
 * Supports both drag-and-drop and arrow button reordering
 */
const DraggableList = ({
  items,
  onReorder,
  renderItem,
  theme,
  showArrows = true,
  disabled = false
}) => {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const dragCounter = useRef(0);

  // Drag and Drop Handlers
  const handleDragStart = (e, index) => {
    if (disabled) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.innerHTML);
  };

  const handleDragEnter = (e, index) => {
    if (disabled) return;
    e.preventDefault();
    dragCounter.current++;
    if (draggedIndex !== null && index !== draggedIndex) {
      setDragOverIndex(index);
    }
  };

  const handleDragOver = (e) => {
    if (disabled) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = (e) => {
    if (disabled) return;
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e, dropIndex) => {
    if (disabled) return;
    e.preventDefault();
    e.stopPropagation();

    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      const newItems = [...items];
      const draggedItem = newItems[draggedIndex];

      // Remove dragged item
      newItems.splice(draggedIndex, 1);

      // Insert at new position
      const insertIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
      newItems.splice(insertIndex, 0, draggedItem);

      onReorder(newItems);
    }

    // Reset drag state
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragCounter.current = 0;
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragCounter.current = 0;
  };

  // Arrow Button Handlers
  const moveItem = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= items.length) return;

    const newItems = [...items];
    [newItems[index], newItems[newIndex]] = [newItems[newIndex], newItems[index]];
    onReorder(newItems);
  };

  return (
    <div style={{
      backgroundColor: theme.background,
      padding: '12px',
      borderRadius: '6px',
      border: `1px solid ${theme.border}`
    }}>
      {items.map((item, index) => (
        <div
          key={item.value || index}
          draggable={!disabled}
          onDragStart={(e) => handleDragStart(e, index)}
          onDragEnter={(e) => handleDragEnter(e, index)}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={(e) => handleDrop(e, index)}
          onDragEnd={handleDragEnd}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px',
            marginBottom: index < items.length - 1 ? '8px' : 0,
            backgroundColor: theme.surface,
            borderRadius: '4px',
            border: `1px solid ${theme.border}`,
            cursor: disabled ? 'default' : 'move',
            opacity: draggedIndex === index ? 0.5 : 1,
            transform: dragOverIndex === index ? 'scale(1.02)' : 'scale(1)',
            transition: 'all 0.2s ease',
            position: 'relative',
            ...(dragOverIndex === index && {
              backgroundColor: theme.primary + '10',
              borderColor: theme.primary
            })
          }}
        >
          {/* Drag Handle */}
          {!disabled && (
            <div style={{
              marginRight: '12px',
              color: theme.textSecondary,
              cursor: 'grab',
              fontSize: '20px',
              userSelect: 'none'
            }}>
              ⋮⋮
            </div>
          )}

          {/* Item Content */}
          <div style={{ flex: 1 }}>
            {renderItem ? renderItem(item, index) : (
              <span style={{
                color: theme.text,
                fontWeight: '400'
              }}>
                {item.label || item}
              </span>
            )}
          </div>

          {/* Arrow Buttons */}
          {showArrows && !disabled && (
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  moveItem(index, -1);
                }}
                disabled={index === 0}
                style={{
                  padding: '4px 8px',
                  backgroundColor: index === 0 ? theme.border : theme.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: index === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '12px'
                }}
                title="Move up"
              >
                ↑
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  moveItem(index, 1);
                }}
                disabled={index === items.length - 1}
                style={{
                  padding: '4px 8px',
                  backgroundColor: index === items.length - 1 ? theme.border : theme.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: index === items.length - 1 ? 'not-allowed' : 'pointer',
                  fontSize: '12px'
                }}
                title="Move down"
              >
                ↓
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Drag and Drop Hint */}
      {!disabled && items.length > 1 && (
        <div style={{
          marginTop: '12px',
          padding: '8px',
          backgroundColor: theme.primary + '10',
          borderRadius: '4px',
          fontSize: '12px',
          color: theme.textSecondary,
          textAlign: 'center'
        }}>
          💡 Tip: Drag items to reorder or use arrow buttons
        </div>
      )}
    </div>
  );
};

export default DraggableList;