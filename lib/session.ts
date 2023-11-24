/**
 * we'll keep all the data about the currently logged in user
 * Using the funcs in this file, when the user signs in, their
 * details will be added to the grafbase database
 */

import { getServerSession } from 'next-auth/next';
import { NextAuthOptions, User } from 'next-auth';
import { AdapterUser } from 'next-auth/adapters';
import GoogleProvider from "next-auth/providers/google";
import jsonwebtoken from 'jsonwebtoken'
import { JWT } from "next-auth/jwt";

import { createUser, getUser } from "./actions";
import { SessionInterface, UserProfile } from '@/tstypes/common.types';

// th
export const authOptions: NextAuthOptions = {
    providers: [
        // get these from console.cloud.google.com
        GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID!, // the '!' means can be null
          // can also be written as: clientId: process.env.GOOGLE_CLIENT_ID || '',
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!, // the '!' means can be null
        }),
    ],
    // will be used to connect NextAuth to Grafbase
    // and keep track of their JWT
    jwt: {
        encode: ({ secret, token }) => {
          const encodedToken = jsonwebtoken.sign(
            {
              ...token, 
              iss: "grafbase",
              exp: Math.floor(Date.now() / 1000) + 60 * 60,
            },
            secret
          );
          
          return encodedToken;
        },
        decode: async ({ secret, token }) => {
          const decodedToken = jsonwebtoken.verify(token!, secret);
          return decodedToken as JWT;
        },
    },
    theme: {
        colorScheme: "light",
        logo: "/logo.svg",
    },
    // HOT
    callbacks: {
        async session({ session }) {
        // this one will be triggered everytime a user visits the page
        
        
        /**
         * We dont need to return just the google user from our auth screen
         * not very useful to us. We also need to have our own user who has an
         * account in our graphbase database
         * Our user will have stuff that are linked to him/her such as projects etc
         * 
         * Therefore this block of code connects the Google user with our user and their
         * assets
         */

        // first get the email
        const email = session?.user?.email as string;

        try {
          // get the user data from our databas based on the email we got from google
          const data = await getUser(email) as { user?: UserProfile }

          /**
           * In the below funcion
           * 
           * const newSession = { ...session, ... }: 
           * This is using the spread (...) operator 
           *   to create a new object (newSession) by copying all the properties of the existing 
           *   session object into it. This is a way to shallow copy an object, creating a new 
           *   object with the same properties as the original.
           * 
           * user: { ...session.user, ...data?.user }
           * Within the new session (newSession) object, a property named user is being defined. The value of 
           *   this property is an object created by merging the properties of 
           *   two objects - session.user and data?.user.
           * 
            *    (a)  ...session.user: This spreads all the properties of the session.user object into 
            *      the new user object. This is done to retain any existing properties of the user.
            * 
            *    (b)  ...data?.user: This is using optional chaining (?.) to safely access the user 
            *      property of the data object. If data is undefined or null, the whole expression 
            *      evaluates to undefined. If data is defined, it spreads the properties of data.user 
            *      into the user object.
           * 
           * So, in summary, newSession is a new object that inherits all properties from the 
           *   existing session object, and it has an updated user property that incorporates 
           *   properties from both the existing session.user and data?.user objects. This is a 
           *   common pattern used for updating or extending objects in an immutable way in React 
           *   and TypeScript applications.
           * 
           */
          const newSession = {
            /**
             * So this function connects the google user information with that
             * in our database
             */
            ...session,
            user: {
              ...session.user,
              ...data?.user,
            },
          };

          return newSession;

        } catch (error) {
          // log the error ...
          console.log('Error retrieving user data:', error)
          //... then return a session/ could be empty though
          return session;
        }

        },
        async signIn({ user }: {
            // whenever the user signs in so we can get the user info within the User object
          user: AdapterUser | User
        }) {
          try {
            // 1.0 get user from db if they exist
            const userExists = await getUser(user?.email as string) as { user?: UserProfile };
            /**
             * CRITICAL EXPLAINER
             * we are passing the email as a string, then the output will be typed as UserProfile
             * 
             * The overall purpose of this line of code is to call the getUser function with the user's email, 
             * wait for the asynchronous operation to complete using await, and then treat the result as an object 
             * with an optional user property of type UserProfile. The userExists variable will hold this result.
             * 
             * The user?.email is using optional chaining (?.), which means if user is defined and has an 
             * email property, it will be used; otherwise, it will be undefined.
             * 
             * as string: This is a type assertion in TypeScript, telling the TypeScript compiler to treat user?.email as a string. 
             * This is necessary because optional chaining (?.) could result in a value that is potentially undefined.
             * 
             * as { user?: UserProfile }: This is another type assertion, specifying that the result of getUser 
             * should be treated as an object with an optional property named user of type UserProfile. The use of as 
             * is a way to tell TypeScript that the value returned by getUser will have this specific shape.
             * 
             * 
             * Keep in mind that using type assertions (as) should be done with caution, as it essentially 
             * tells TypeScript to trust you about the type. If the actual type of the result from getUser 
             * does not match the asserted type, it can lead to runtime errors. It's usually better to 
             * handle types safely using conditional checks or other TypeScript features.
             * 
             * 
             */

            // 2.0 if they dont exist, create them in grafbase db
            if (!userExists.user) {
              await createUser(
                user.name as string, 
                user.email as string, 
                user.image as string
              )
            }

            // return the user that was created or fetched

            /*
            
            
            
            */
    
            return true;
          } catch (error: any) {
            console.log("Error checking if user exists: ", error.message);
            return false;
          }
        },
    },
};


export async function getCurrentUser() {
    const session = await getServerSession(authOptions) as SessionInterface;
  
    return session;
}

  