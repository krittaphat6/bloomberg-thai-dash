import React, { useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { GripVertical, Code, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CodeNodeData {
  code: string;
  language: string;
  onChange?: (data: any) => void;
}

const LANGUAGES = [
  'javascript', 'typescript', 'python', 'java', 'cpp', 'csharp', 
  'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'sql', 'html', 
  'css', 'json', 'yaml', 'markdown', 'bash', 'plaintext'
];

export default function CodeNode({ data, selected }: NodeProps<CodeNodeData>) {
  const [isEditing, setIsEditing] = useState(false);
  const [code, setCode] = useState(data.code || '// Your code here');
  const [language, setLanguage] = useState(data.language || 'javascript');
  const [copied, setCopied] = useState(false);

  const handleBlur = () => {
    setIsEditing(false);
    data.onChange?.({ code, language });
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`min-w-[350px] rounded-lg bg-gradient-to-br from-cyan-950/50 to-card/90 backdrop-blur-sm border-2 transition-all duration-200 ${
        selected 
          ? 'border-terminal-cyan shadow-lg shadow-terminal-cyan/20' 
          : 'border-terminal-cyan/30 hover:border-terminal-cyan/50'
      }`}
      onDoubleClick={() => setIsEditing(true)}
    >
      <Handle type="target" position={Position.Top} className="!bg-terminal-cyan !w-3 !h-3 !border-2 !border-background" />
      <Handle type="target" position={Position.Left} className="!bg-terminal-cyan !w-3 !h-3 !border-2 !border-background" />
      
      <div className="drag-handle flex items-center gap-2 px-3 py-2 border-b border-terminal-cyan/20 cursor-grab active:cursor-grabbing bg-terminal-cyan/5">
        <GripVertical className="w-3 h-3 text-terminal-cyan/50" />
        <Code className="w-4 h-4 text-terminal-cyan" />
        <Select value={language} onValueChange={(v) => { setLanguage(v); data.onChange?.({ code, language: v }); }}>
          <SelectTrigger className="h-6 w-28 text-xs bg-transparent border-terminal-cyan/30">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LANGUAGES.map(lang => (
              <SelectItem key={lang} value={lang} className="text-xs">{lang}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={handleCopy}
        >
          {copied ? <Check className="w-3 h-3 text-terminal-green" /> : <Copy className="w-3 h-3 text-terminal-cyan/50" />}
        </Button>
      </div>
      
      <div className="p-3">
        {isEditing ? (
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={(e) => {
              if (e.key === 'Escape') handleBlur();
              if (e.key === 'Tab') {
                e.preventDefault();
                const start = e.currentTarget.selectionStart;
                const end = e.currentTarget.selectionEnd;
                const newCode = code.substring(0, start) + '  ' + code.substring(end);
                setCode(newCode);
                setTimeout(() => {
                  e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 2;
                }, 0);
              }
            }}
            className="w-full min-h-[150px] bg-black/30 rounded p-2 font-mono text-sm text-terminal-cyan border-none outline-none resize-y"
            autoFocus
            spellCheck={false}
          />
        ) : (
          <pre className="bg-black/30 rounded p-3 overflow-x-auto">
            <code className="font-mono text-sm text-terminal-cyan whitespace-pre">
              {code}
            </code>
          </pre>
        )}
      </div>
      
      <Handle type="source" position={Position.Bottom} className="!bg-terminal-cyan !w-3 !h-3 !border-2 !border-background" />
      <Handle type="source" position={Position.Right} className="!bg-terminal-cyan !w-3 !h-3 !border-2 !border-background" />
    </div>
  );
}
