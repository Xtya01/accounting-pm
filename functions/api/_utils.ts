// functions/api/_utils.ts
export const json = (data: any, status = 200) => 
  new Response(JSON.stringify(data), { 
    status, 
    headers: { 'Content-Type': 'application/json' } 
  });

export const uid = () => crypto.randomUUID();

export const getUser = (context: any) => context.data.user.email;
