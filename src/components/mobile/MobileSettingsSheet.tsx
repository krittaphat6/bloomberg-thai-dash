import { LogOut, Moon, Sun, User, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import ThemeSwitcher from '@/components/ThemeSwitcher';

interface MobileSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSignOut: () => void;
}

export function MobileSettingsSheet({ open, onOpenChange, onSignOut }: MobileSettingsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[70vh] rounded-t-xl">
        <SheetHeader>
          <SheetTitle className="text-terminal-green">Settings</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Profile Section */}
          <div className="flex items-center gap-3 p-3 bg-card rounded-lg border border-border">
            <div className="w-12 h-12 rounded-full bg-terminal-green/20 flex items-center justify-center">
              <User className="w-6 h-6 text-terminal-green" />
            </div>
            <div>
              <p className="font-medium">User Profile</p>
              <p className="text-sm text-muted-foreground">Manage your account</p>
            </div>
          </div>

          <Separator />

          {/* Theme */}
          <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-3">
              <Sun className="w-5 h-5 text-terminal-amber" />
              <span>Appearance</span>
            </div>
            <ThemeSwitcher />
          </div>

          <Separator />

          {/* About */}
          <div className="flex items-center gap-3 p-3">
            <Info className="w-5 h-5 text-terminal-cyan" />
            <div>
              <p className="font-medium">About ABLE Terminal</p>
              <p className="text-sm text-muted-foreground">Version 2.0.0</p>
            </div>
          </div>

          <Separator />

          {/* Sign Out */}
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => {
              onSignOut();
              onOpenChange(false);
            }}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
