import { useRef } from "react";
import { Button } from "@/components/ui/button";

type FaceImagePickerProps = {
  onImageData: (dataUrl: string) => void;
  disabled?: boolean;
  label?: string;
};

export function FaceImagePicker({
  onImageData,
  disabled,
  label = "อัปโหลดรูปแทน",
}: FaceImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const onPick = () => inputRef.current?.click();

  const onChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") onImageData(result);
    };
    reader.readAsDataURL(file);

    // allow picking the same file again
    e.currentTarget.value = "";
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={onChange}
        disabled={disabled}
      />
      <Button
        type="button"
        variant="outline"
        onClick={onPick}
        disabled={disabled}
        className="w-full font-mono border-muted-foreground/30"
      >
        {label}
      </Button>
    </>
  );
}
