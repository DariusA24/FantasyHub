'use client';

import React, { useEffect, useState } from 'react';
import FormContainer from '@/components/form/FormContainer';
import {
  updateProfileAction,
  updateProfileImageAction,
} from '@/utils/actions';
import FormInput from '@/components/form/FormInput';
import { SubmitButton } from '@/components/form/Buttons';
import ImageInputContainer from '@/components/form/ImageInputContainer';
import { getSleeperUserById } from '@/utils/sleeperService';

type UserProfile = {
  id: number;
  clerkId: string;
  sleeperProfileId: string | null;
  firstName?: string;
  lastName?: string;
  username?: string;
  profileImage?: string;
};

function ProfilePage() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [sleeperUsername, setSleeperUsername] = useState<string>('');

  useEffect(() => {
    console.log('In the use effect');
    const fetchUserProfile = async () => {
      try {
        const res = await fetch('/api/profile', { cache: 'no-store' });
        console.log('Profile response status:', res.status);
        if (!res.ok) throw new Error('Failed to load profile');
        const data = await res.json();
        console.log('Fetched profile data (raw):', data);
        setUserProfile(data.profile); 
      } catch (err) {
        console.error('Error loading profile:', err);
        setUserProfile(null);
      }
    };

    fetchUserProfile();
  }, []);

  useEffect(() => {
    const fetchSleeperUsername = async () => {
      if (userProfile?.sleeperProfileId) {
        try {
          const sleeperUser = await getSleeperUserById(
            userProfile.sleeperProfileId
          );
          setSleeperUsername(
            typeof sleeperUser === 'string'
              ? sleeperUser
              : sleeperUser?.username ?? ''
          );
        } catch (error) {
          console.error('Error fetching sleeper username:', error);
          setSleeperUsername('');
        }
      } else {
        setSleeperUsername('');
      }
    };

    fetchSleeperUsername();
  }, [userProfile?.sleeperProfileId]);

  console.log('User Profile:', userProfile);

  return (
    <section>
      <h1 className="text-2xl font-semibold mb-8 capitalize">
        user profile
      </h1>
      <div className="border p-8 rounded-md">
        <ImageInputContainer
          image={userProfile?.profileImage || ''}
          name={userProfile?.profileImage || ''}
          action={updateProfileImageAction}
          text="Update Profile Image"
        />
        <FormContainer action={updateProfileAction}>
          <div className="grid md:grid-cols-2 gap-4 mt-4 ">
            <FormInput
              type="text"
              name="firstName"
              label="First Name"
              defaultValue={userProfile?.firstName || ''}
            />
            <FormInput
              type="text"
              name="lastName"
              label="Last Name"
              defaultValue={userProfile?.lastName || ''}
            />
            <FormInput
              type="text"
              name="username"
              label="Username"
              defaultValue={userProfile?.username || ''}
            />
            <FormInput
              type="text"
              name="sleeperId"
              label="SleeperId"
              defaultValue={sleeperUsername || ''}
            />
          </div>
          <SubmitButton
            text="Update Profile"
            className="mt-8"
            size={'default'}
          />
        </FormContainer>
      </div>
    </section>
  );
}

export default ProfilePage;