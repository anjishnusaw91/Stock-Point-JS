'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';

interface UserProfileData {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  avatar_url: string | null;
  bio: string | null;
  investment_style: string | null;
  risk_tolerance: string | null;
  created_at: string;
}

const UserProfile: React.FC = () => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    address: '',
    bio: '',
    investment_style: '',
    risk_tolerance: ''
  });

  useEffect(() => {
    if (user) {
      loadUserProfile();
      checkProfilesTable();
    }
  }, [user]);

  const loadUserProfile = async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('Loading profile for user:', user?.id);
      
      if (!user || !user.id) {
        throw new Error('User not authenticated or missing ID');
      }
      
      // Check if the user profile exists
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      console.log('Profile query result:', { profileData, profileError });

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          // No profile found - create a new one
          await createNewProfile();
        } else {
          throw new Error(`Error retrieving profile: ${profileError.message}`);
        }
      } else if (profileData) {
        // Log the structure of the profileData to help debug
        console.log('Available profile fields:', Object.keys(profileData));
        
        setUserProfile(profileData);
        
        // Only set form fields that exist in the profile
        const newFormData = {
          full_name: '',
          phone: '',
          address: '',
          bio: '',
          investment_style: '',
          risk_tolerance: ''
        };
        
        // Only populate fields that exist in the profile data
        for (const key in newFormData) {
          if (key in profileData) {
            newFormData[key as keyof typeof newFormData] = profileData[key] || '';
          }
        }
        
        setFormData(newFormData);
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError(`Failed to load profile data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const checkProfilesTable = async () => {
    try {
      console.log('Checking profiles table existence...');
      
      // Get table info
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);
      
      console.log('Profiles table check:', { data, error });
      
      if (error) {
        console.error('Error checking profiles table:', error);
        // Try to test create profile table or fix access issues
        await testCreateProfile();
      }
    } catch (err) {
      console.error('Exception checking profiles table:', err);
    }
  };
  
  const testCreateProfile = async () => {
    try {
      if (!user) return;
      
      console.log('Testing direct profile creation...');
      // Test creating a profile directly
      const testProfile = {
        id: user.id,
        email: user.email,
        full_name: 'Test User',
        created_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('profiles')
        .upsert(testProfile, { onConflict: 'id' })
        .select();
        
      console.log('Test profile creation result:', { data, error });
    } catch (err) {
      console.error('Test profile creation failed:', err);
    }
  };

  const createNewProfile = async () => {
    if (!user) return;
    
    console.log('Creating new profile for user:', user.id);
    console.log('Current auth status:', { id: user.id, email: user.email });
    
    try {
      // First, try to use the Supabase server-side function approach to bypass RLS
      // This will use the service_role key in the backend
      const response = await fetch('/api/profiles/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || '',
        }),
      });
      
      const result = await response.json();
      console.log('Profile creation API result:', result);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create profile via API');
      }
      
      // Reload the profile
      await loadUserProfile();
    } catch (apiError) {
      console.error('API profile creation failed, trying direct approach:', apiError);
      
      // Fallback to direct approach
      const newProfile = {
        id: user.id,
        full_name: user.user_metadata?.full_name || '',
        email: user.email || '',
        created_at: new Date().toISOString()
      };
      
      const { data, error: insertError } = await supabase
        .from('profiles')
        .upsert([newProfile], { onConflict: 'id' })
        .select();
        
      console.log('Profile creation result:', { data, insertError });
      
      if (insertError) {
        throw new Error(`Error creating profile: ${insertError.message}`);
      }
      
      if (data && data[0]) {
        setUserProfile(data[0]);
        setFormData({
          full_name: data[0].full_name || '',
          phone: data[0].phone || '',
          address: data[0].address || '',
          bio: data[0].bio || '',
          investment_style: data[0].investment_style || '',
          risk_tolerance: data[0].risk_tolerance || ''
        });
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('Updating profile for user:', user?.id);
      console.log('Update data:', formData);
      
      // Only include fields that exist in the profile
      const validFields = userProfile ? Object.keys(userProfile) : ['id', 'full_name', 'email'];
      console.log('Valid profile fields:', validFields);
      
      // Filter the form data to only include valid fields
      const filteredData: Record<string, any> = {
        id: user?.id,
        email: user?.email
      };
      
      for (const key in formData) {
        if (validFields.includes(key)) {
          filteredData[key] = formData[key as keyof typeof formData] || null;
        }
      }
      
      console.log('Filtered update data:', filteredData);
      
      try {
        // Try API approach first to bypass RLS
        const response = await fetch('/api/profiles/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(filteredData),
        });
        
        const result = await response.json();
        console.log('Profile update API result:', result);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to update profile via API');
        }
      } catch (apiError) {
        console.error('API profile update failed, trying direct approach:', apiError);
        
        // Fallback to direct approach
        const { error: updateError } = await supabase
          .from('profiles')
          .upsert(filteredData, { onConflict: 'id' });

        console.log('Update result:', { updateError });
          
        if (updateError) throw updateError;
      }

      // Refresh user profile data
      await loadUserProfile();
      setSuccess('Profile updated successfully');
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError(`Failed to update profile: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="p-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">User Profile</h2>
          <p className="text-gray-600">Please sign in to view your profile.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">User Profile</h2>
          <div className="flex justify-center">
            <div className="animate-pulse">Loading profile...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">User Profile</h2>
          <Button
            onClick={() => setIsEditing(!isEditing)}
            className={isEditing ? "bg-gray-400" : "bg-blue-500"}
          >
            {isEditing ? "Cancel" : "Edit Profile"}
          </Button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
            {success}
          </div>
        )}

        {isEditing ? (
          <form onSubmit={handleSave}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  value={user.email || ''}
                  disabled
                  className="mt-1 bg-gray-100"
                />
                <p className="mt-1 text-xs text-gray-500">Email cannot be changed</p>
              </div>

              <div>
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  className="mt-1"
                />
              </div>

              {userProfile && 'phone' in userProfile && (
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="mt-1"
                  />
                </div>
              )}

              {userProfile && 'address' in userProfile && (
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    className="mt-1"
                  />
                </div>
              )}

              {userProfile && 'bio' in userProfile && (
                <div className={userProfile && 'address' in userProfile ? "md:col-span-2" : ""}>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows={3}
                    className="mt-1"
                  />
                </div>
              )}

              {userProfile && 'investment_style' in userProfile && (
                <div>
                  <Label htmlFor="investment_style">Investment Style</Label>
                  <select
                    id="investment_style"
                    name="investment_style"
                    value={formData.investment_style}
                    onChange={handleChange}
                    className="w-full p-2 mt-1 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select investment style</option>
                    <option value="Value Investing">Value Investing</option>
                    <option value="Growth Investing">Growth Investing</option>
                    <option value="Dividend Investing">Dividend Investing</option>
                    <option value="Index Investing">Index Investing</option>
                    <option value="Day Trading">Day Trading</option>
                    <option value="Swing Trading">Swing Trading</option>
                  </select>
                </div>
              )}

              {userProfile && 'risk_tolerance' in userProfile && (
                <div>
                  <Label htmlFor="risk_tolerance">Risk Tolerance</Label>
                  <select
                    id="risk_tolerance"
                    name="risk_tolerance"
                    value={formData.risk_tolerance}
                    onChange={handleChange}
                    className="w-full p-2 mt-1 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select risk tolerance</option>
                    <option value="Conservative">Conservative</option>
                    <option value="Moderately Conservative">Moderately Conservative</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Moderately Aggressive">Moderately Aggressive</option>
                    <option value="Aggressive">Aggressive</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                className="bg-green-500 hover:bg-green-600"
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ProfileField label="Email" value={user.email || ''} />
              <ProfileField label="Full Name" value={userProfile?.full_name || ''} />
              
              {userProfile?.phone && (
                <ProfileField label="Phone" value={userProfile.phone || 'Not provided'} />
              )}
              
              {userProfile?.address && (
                <ProfileField label="Address" value={userProfile.address || 'Not provided'} />
              )}
              
              {userProfile?.created_at && (
                <ProfileField label="Account Created" value={new Date(userProfile.created_at || '').toLocaleDateString()} />
              )}
              
              {userProfile?.investment_style && (
                <ProfileField label="Investment Style" value={userProfile.investment_style || 'Not specified'} />
              )}
              
              {userProfile?.risk_tolerance && (
                <ProfileField label="Risk Tolerance" value={userProfile.risk_tolerance || 'Not specified'} />
              )}
            </div>

            {userProfile?.bio && (
              <div className="mt-4">
                <h3 className="text-md font-semibold text-gray-700 mb-2">Bio</h3>
                <p className="text-gray-600 bg-gray-50 p-3 rounded-md">{userProfile.bio}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Helper component for profile fields
const ProfileField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <h3 className="text-sm font-semibold text-gray-700">{label}</h3>
    <p className="text-gray-600">{value}</p>
  </div>
);

export default UserProfile; 