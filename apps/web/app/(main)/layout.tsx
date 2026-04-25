import { Nav } from "@/shared/components/Nav";

type MainLayoutProps = { children: React.ReactNode };

const MainLayout = ({ children }: MainLayoutProps) => (
    <>
        <Nav />
        {children}
    </>
);

export default MainLayout;
