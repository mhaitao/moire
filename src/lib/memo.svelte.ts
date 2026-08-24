import { format } from 'date-fns';

export function createMemoList(getData: () => any, config: any) {
    let visibleCount = $state(config.pageSize || 20);
    let selectedTag = $state<string | null>(null);
    let activeSlug = $state<string | null>(null);

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

    // Derived: the memo currently open in the reading view, if any
    const activeMemo = $derived(
        activeSlug ? (getData().memos.find((memo: any) => memo.slug === activeSlug) ?? null) : null
    );

    function loadMore() {
        visibleCount += (config.pageSize || 20);
    }

    function selectTag(tag: string | null) {
        selectedTag = selectedTag === tag ? null : tag;
        visibleCount = config.pageSize || 20;
        activeSlug = null;
    }

    // A memo has no explicit title field (notes synced from Apple Notes use
    // their first line as the title), so derive one from the leading block
    // of the rendered content.
    function getTitle(memo: any, maxLength = 80): string {
        const html: string = memo?.content || '';
        const match = html.match(/<(h[1-6]|p)[^>]*>([\s\S]*?)<\/\1>/i);
        const raw = match ? match[2] : html;
        const text = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
        if (!text) return format(memo.date, 'MMMM d, yyyy');
        return text.length > maxLength ? text.slice(0, maxLength).trimEnd() + '…' : text;
    }

    function openMemo(slug: string) {
        activeSlug = slug;
        window.location.hash = slug;
    }

    function closeMemo() {
        activeSlug = null;
        if (window.location.hash) {
            history.replaceState(null, '', window.location.pathname + window.location.search);
        }
    }

    // Support deep-linking / back-forward navigation via the #slug permalink
    // (the same convention already used by the RSS feed and JSON-LD schema).
    $effect(() => {
        const applyHash = () => {
            const hash = decodeURIComponent(window.location.hash.slice(1));
            activeSlug = hash && getData().memos.some((m: any) => m.slug === hash) ? hash : null;
        };
        applyHash();
        window.addEventListener('hashchange', applyHash);
        return () => window.removeEventListener('hashchange', applyHash);
    });

    return {
        get visibleCount() { return visibleCount },
        get selectedTag() { return selectedTag },
        get allTags() { return allTags },
        get filteredMemos() { return filteredMemos },
        get visibleMemos() { return visibleMemos },
        get groupedMemos() { return groupedMemos },
        get activeMemo() { return activeMemo },
        loadMore,
        selectTag,
        getTitle,
        openMemo,
        closeMemo
    };
}
