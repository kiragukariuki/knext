// here 'use client' means that this one's not going to be rendered on a server
"use client"

import { getProviders, signIn } from "next-auth/react"
import { useState, useEffect } from "react"

// define the Providers type
// this is how Next structures their providers
type Provider = {
  id: string;
  name: string;
  type: string;
  signinUrl: string;
  callbackUrl: string;
  // the questionmark means this is optional
  signinUrlParams?: Record<string, string> | undefined;
};

type Providers = Record<string, Provider>;


const AuthProvider = () => {
  // state
  const [providers, setProviders] = useState<Providers | null>(null);

  // to fetch the providers we use the useEffect hook
  useEffect(() => {
    const fetchProviders = async () => {
        const res = await getProviders();

        // debug 
        console.log(res)

        setProviders(res);
    }

    fetchProviders();
}, []);

  // first we check if we have providers
  if(providers){
      return (
        <div>
          {Object.values(providers)
          .map((provider: Provider, key) => (
            <button 
              key={key} 
              title='Sign In' 
              onClick={() => signIn(provider?.id)}>
                {provider.id}
            </button>
          ))}
        </div>
      )
  }

  
}

export default AuthProvider