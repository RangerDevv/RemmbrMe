function Dashboard() {

    let greeting = "";
    const time = new Date().getHours();
    if (time >= 0 && time < 12) {
        greeting = "Good Morning";
    } else if (time >= 12 && time < 18) {
        greeting = "Good Afternoon";
    } else {
        greeting = "Good Evening";
    }

    return (
        <div>
        <h2 class="text-2xl">{greeting}</h2>
        <p>Welcome to your dashboard!</p>
        </div>
    );
    }
export default Dashboard;
