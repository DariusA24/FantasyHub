'use server'
import { clerkClient, currentUser } from "@clerk/nextjs/server";
import { prisma } from './db';
import { redirect } from "next/navigation";
import { revalidatePath } from 'next/cache';
import { imageSchema, profileSchema, propertySchema, validateWithZodSchema } from "./schemas";
import { uploadImage } from "./supabase";
import { getSleeperUserByUsername } from "./sleeperService";

export const getAuthUser = async()=> {
    const user = await currentUser();
    if(!user) throw new Error("You must be logged in to access this route");
    if(!user.privateMetadata.hasProfile) redirect('/profile/create');
    return user;
  }

  const renderError = (error: unknown): {message:string} => {
    console.log(error); 
    return {message: error instanceof Error ? error.message : 'An error occurred'}; 
  }

export const fetchProfileImage = async () => {
    const user = await currentUser();
    if(!user) return null

    console.log(user); 
    const profile = await prisma.profile.findUnique({
      where:{
        clerkId: user.id
      },
      select:{
        profileImage: true,
      },
    });
    return profile?.profileImage; 
  };

  export const fetchProfile = async() => {
    const user = await getAuthUser();
    const profile = await prisma.profile.findUnique({
      where:{
        clerkId:user.id
      }
    })
    if(!profile) redirect('/profile/create'); 
    return profile; 
  }; 

  export const createProfileAction = async (prevState: any, formData: FormData) => {
    try {
     const user = await currentUser(); 
     if(!user) throw new Error("Please login to create a profile"); 
     console.log(user);   
     const rawData = Object.fromEntries(formData);
     const validatedFields = validateWithZodSchema(profileSchema, rawData);
     const existingUsername = await prisma.profile.findFirst({ where: { username: validatedFields.username } });
     if (existingUsername) throw new Error('That username is already taken. Please choose a different one.');
     await prisma.profile.create({
       data:{
          clerkId: user.id,
          email: user.emailAddresses[0].emailAddress,
          profileImage: user.imageUrl ?? '',
          ...validatedFields,
       }
     });
     const client = await clerkClient();
     await client.users.updateUserMetadata(user.id, {
       privateMetadata: {
          hasProfile: true,
       }
     });
     return { message: 'Profile created successfully!' };
    } catch (error: any) {
       if (error?.code === 'P2002') return { message: 'That username is already taken. Please choose a different one.' };
       return renderError(error);
    }
   };

  export const updateProfileAction = async (
    prevState: any,
    formData:FormData
  ): Promise<{message:string}> => {
    const user = await getAuthUser();

    try {
      const rawData = Object.fromEntries(formData);

      const validatedFields = validateWithZodSchema(profileSchema, rawData);

      const sleeperUsername = (rawData.sleeperId as string | undefined)?.trim() ?? '';

      let sleeperUpdate: { sleeperProfileId: string | null } | undefined;
      if ('sleeperId' in rawData) {
        if (sleeperUsername) {
          const sleeperUser = await getSleeperUserByUsername(sleeperUsername);
          if (!sleeperUser?.user_id) throw new Error('Sleeper username not found');
          sleeperUpdate = { sleeperProfileId: sleeperUser.user_id as string };
        } else {
          sleeperUpdate = { sleeperProfileId: null };
        }
      }

      await prisma.profile.update({
        where: { clerkId: user.id },
        data: {
          ...validatedFields,
          ...sleeperUpdate,
        },
      });

      revalidatePath('/profile');
      return {message: 'Profile updated sucessfully'};
    } catch (error) {
      return renderError(error);
    }
  };


  export const updateProfileImageAction = async (
    prevState: any,
    formData: FormData
  ): Promise<{message: string}> => {
  
    const user = await getAuthUser();
    try {
      const image = formData.get('image') as File;
      const validateFields = validateWithZodSchema(imageSchema, { image }); 
      const fullPath = await uploadImage(validateFields.image); 
  
      await prisma.profile.update({
        where:{
          clerkId:user.id
        }, data: {
          profileImage: fullPath
        }
      });
  
      revalidatePath('/profile'); 
      return { message: 'Profile image updated successfully'}; 
    }
    catch(error) {
     return renderError(error); 
    }
  };

