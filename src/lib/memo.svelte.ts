import { format } from 'date-fns';

export function createMemoList(getData: () => any, config: any) {
    let visibleCount = $state(config.pageSize || 20);
    let selectedTag = $state<string | null>(null);

    // Derived: Get all unique tags
    const allTags = $derived.by(() => {
        const tags = new Set<string>();
        getData().memos.forEach((memo: any) => {
            memo.tags?.forEach((t: string) => tags.add(t));
        });
        return Array.from(tags).sort();
    });

    // Derived: Filter memos by tag
    const filteredMemos = $derived(
        selectedTag !== null
            ? getData().memos.filter((memo: any) => memo.tags?.includes(selectedTag as string))
            : getData().memos
    );

    // Derived: Slice the memos first
    const visibleMemos = $derived(filteredMemos.slice(0, visibleCount));

    // Group memos by Date (YYYY-MM-DD)
    const groupedMemos = $derived.by(() => {
        const groups: Record<string, any[]> = {};
        visibleMemos.forEach((memo: any) => {
            const dateKey = format(memo.date, 'yyyy-MM-dd');
            if (!groups[dateKey]) groups[dateKey] = [];
            groups[dateKey].push(memo);
        });
        return groups;
    });

    function loadMore() {
        visibleCount += (config.pageSize || 20);
    }

    function selectTag(tag: string | null) {
        selectedTag = selectedTag === tag ? null : tag;
      visibleCount = config.pageSize || 20;
    }

    return {
        get visibleCount() { return visibleCount },
        get selectedTag() { return selectedTag },
        get allTags() { return allTags },
        get filteredMemos() { return filteredMemos },
        get visibleMemos() { return visibleMemos },
        get groupedMemos() { return groupedMemos },
        loadMore,
        selectTag
    };
}
