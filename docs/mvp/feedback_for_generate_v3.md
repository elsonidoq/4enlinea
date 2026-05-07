1. Both fork setup and parity control are using old IU. You should copy the Zugzwang interface. 

2. There are still classifier bugs, they are marked in the database

4. The user facing frontend has some bugs. For example the total count of puzzles per category does not match with the total count exhibited in the internal tool. There is some disconnection.

5. Refactor the code to improve the naming convention. The "cat1", "cat2", etc is confusing. Things must be called by their name. 1 is immediate threat, 2 is forced block, 3 is double threat, 4 is fork setup, 5 is zugzwang, 6 is parity control, 7 is forbidden column. Modify predicates, documentation, and all the code.  

6. The annotator_note should be a field of candidates, not of false_positives
