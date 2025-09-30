import { Calculator, Check, X } from 'lucide-react';
import { useState } from 'react';

interface ExcelFormulaBarProps {
  activeCell: string;
  formulaValue: string;
  onFormulaChange: (value: string) => void;
}

export const ExcelFormulaBar = ({ activeCell, formulaValue, onFormulaChange }: ExcelFormulaBarProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState(formulaValue);

  const handleSubmit = () => {
    onFormulaChange(tempValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTempValue(formulaValue);
    setIsEditing(false);
  };

  const handleFocus = () => {
    setIsEditing(true);
    setTempValue(formulaValue);
  };

  return (
    <div className="flex items-center gap-2 p-2 border-b border-border bg-card">
      {/* Name Box */}
      <div className="flex items-center gap-1">
        <span className="text-sm font-medium w-20 text-center border border-terminal-green py-1 bg-background text-terminal-green">
          {activeCell}
        </span>
        <button className="p-1 hover:bg-terminal-green/10 rounded border border-border">
          <Calculator className="h-4 w-4 text-terminal-green" />
        </button>
      </div>

      {/* Action Buttons (shown when editing) */}
      {isEditing && (
        <div className="flex gap-1">
          <button 
            onClick={handleCancel}
            className="p-1 hover:bg-terminal-red/10 rounded border border-border"
          >
            <X className="h-4 w-4 text-terminal-red" />
          </button>
          <button 
            onClick={handleSubmit}
            className="p-1 hover:bg-terminal-green/10 rounded border border-border"
          >
            <Check className="h-4 w-4 text-terminal-green" />
          </button>
        </div>
      )}

      {/* Formula Input */}
      <div className="flex-1">
        <input
          type="text"
          value={isEditing ? tempValue : formulaValue}
          onChange={(e) => {
            if (isEditing) {
              setTempValue(e.target.value);
            }
          }}
          onFocus={handleFocus}
          onBlur={handleSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSubmit();
            } else if (e.key === 'Escape') {
              handleCancel();
            }
          }}
          className="w-full p-1 border border-border text-sm focus:outline-none focus:border-terminal-green bg-background text-foreground"
          placeholder="Enter formula or value"
        />
      </div>
    </div>
  );
};