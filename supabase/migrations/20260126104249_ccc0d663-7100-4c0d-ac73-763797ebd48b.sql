-- Create updated_at trigger function first
CREATE OR REPLACE FUNCTION public.update_face_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create admin check function
CREATE OR REPLACE FUNCTION public.is_face_admin(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT check_user_id::text IN (
    SELECT id FROM public.users WHERE email IN ('krittaphat6@hotmail.com', 'admin@ableterminal.com')
  )
$$;

-- Create face_registrations table for Face Scan Authentication
CREATE TABLE public.face_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  face_image_url TEXT,
  face_encoding TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.face_registrations ENABLE ROW LEVEL SECURITY;

-- Users can view their own registration
CREATE POLICY "Users can view own face registration"
ON public.face_registrations
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own registration
CREATE POLICY "Users can register their face"
ON public.face_registrations
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending registration
CREATE POLICY "Users can update own pending registration"
ON public.face_registrations
FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending');

-- Admin can view all registrations
CREATE POLICY "Admin can view all registrations"
ON public.face_registrations
FOR SELECT
USING (public.is_face_admin(auth.uid()));

-- Admin can update any registration (approve/reject)
CREATE POLICY "Admin can update registrations"
ON public.face_registrations
FOR UPDATE
USING (public.is_face_admin(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_face_registrations_updated_at
BEFORE UPDATE ON public.face_registrations
FOR EACH ROW
EXECUTE FUNCTION public.update_face_updated_at();

-- Enable realtime for status updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.face_registrations;