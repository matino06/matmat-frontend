export function groupByKey(objectives, key, onNewGroup, onExistingGroup) {
    return objectives.reduce((acc, current, index) => {
        const lastGroup = acc[acc.length - 1];

        if (!lastGroup || lastGroup[key] !== current[key]) {
            acc.push(onNewGroup(current, index));
        } else {
            onExistingGroup(lastGroup, current, index);
        }

        return acc;
    }, []);
}