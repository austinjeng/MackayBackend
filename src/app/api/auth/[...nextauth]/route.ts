import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import prisma from '@/lib/prisma';
import * as bcrypt from 'bcrypt';

const authHandler = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: "Username", type: "text" },
        password: {  label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log('Authorize function called');
        console.log('Credentials:', credentials);

        if (!credentials) {
          console.log('No credentials provided');
          return null;
        }

        const admin = await prisma.admin.findUnique({
          where: { username: credentials.username },
        });

        console.log('Admin from DB:', admin);

        if (admin) {
          const passwordMatches = await bcrypt.compare(credentials.password, admin.passwordHash);
          console.log('Password matches:', passwordMatches);

          if (passwordMatches) {
            const user = await prisma.user.findUnique({
              where: { id: admin.userId },
            });
            console.log('User found:', user);
            return user;
          }
        }
        
        console.log('Authentication failed');
        return null;
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
});

export { authHandler as GET, authHandler as POST };
