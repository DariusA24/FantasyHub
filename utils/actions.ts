'use server'
import { currentUser } from "@clerk/nextjs/server";
import db from './db';
import { redirect } from "next/navigation";

const getAuthUser = async()=> {
    const user = await currentUser();
    if(!user) throw new Error("You must be logged in to access this route");
    if(!user.privateMetadata.hasProfile) redirect('/profile/create');
    return user;
  }

export const fetchProfileImage = async () => {
    const user = await currentUser();
    if(!user) return null

    const profile = await db.profile.findUnique({
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
    const profile = await db.profile.findUnique({
      where:{
        clerkId:user.id
      }
    })
    if(!profile) redirect('/profile/create'); 
    return profile; 
  }; 

